import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CustomerBookingDto, BookingQuoteDto, AssignRoomDto, CancelBookingDto, ExtendStayDto, LateArrivalDto, NoShowDto } from './contracts';
import { HotelService } from './hotel.service';
import { bookingLookupToken, day, hotelToday, isSerializationFailure, isUnique, nights, roundMoney, sha, token, HOLD_MINUTES, assertVnd } from './util';

const ACTIVE = ['CONFIRMED', 'CHECKED_IN'] as const;
const bookingInclude = { guest: true, room: { select: { number: true, cleaningStatus: true } }, roomType: { select: { code: true, nameEn: true, nameVi: true } }, payments: true, services: true, review: { select: { id: true } } } as const;

@Injectable()
export class BookingService {
  constructor(private readonly db: PrismaService, private readonly hotel: HotelService) { }

  async get(code: string) {
    await this.expirePendingHolds();
    const b = await this.db.booking.findUnique({ where: { code }, include: bookingInclude });
    if (!b) throw new NotFoundException('Booking not found.');
    return this.safeBooking(b);
  }

  private safeBooking<T extends { lookupTokenHash: string; payloadHash: string; clientRequestId: string; }>(b: T): Omit<T, 'lookupTokenHash' | 'payloadHash' | 'clientRequestId'> {
    const { lookupTokenHash: _lookupTokenHash, payloadHash: _payloadHash, clientRequestId: _clientRequestId, ...safe } = b;
    return safe;
  }

  async list(status?: string) {
    if (status && !['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW', 'EXPIRED'].includes(status)) throw new BadRequestException('Invalid booking status filter.');
    await this.expirePendingHolds();
    const rows = await this.db.booking.findMany({ where: status ? { status: status as never } : {}, include: bookingInclude, orderBy: { createdAt: 'desc' } });
    return rows.map((b) => this.safeBooking(b));
  }

  async customerList(userId: string) {
    await this.expirePendingHolds();
    const rows = await this.db.booking.findMany({ where: { customerId: userId }, include: bookingInclude, orderBy: { createdAt: 'desc' } });
    return rows.map((b) => this.customerBooking(b));
  }

  async lookup(code: string, lookupToken: string) {
    await this.expirePendingHolds();
    const b = await this.db.booking.findUnique({ where: { code }, include: bookingInclude });
    if (!b || sha(lookupToken) !== b.lookupTokenHash) throw new NotFoundException('Booking not found.');
    return this.customerBooking(b);
  }

  private customerBooking(b: Prisma.BookingGetPayload<{ include: typeof bookingInclude; }>) {
    const due = ['CANCELLED', 'NO_SHOW', 'EXPIRED'].includes(b.status) ? b.cancelFeeVnd : b.totalVnd;
    const paid = b.payments.reduce((sum, p) => sum + (p.kind === 'PAYMENT' ? p.amountVnd : -p.amountVnd), 0);
    return { code: b.code, checkIn: b.checkIn, checkOut: b.checkOut, adults: b.adults, children: b.children, status: b.status, ratePlan: b.ratePlan, roomType: b.roomType, guest: { name: b.guest.name, email: b.guest.email }, totalVnd: b.totalVnd, roomTotalVnd: b.roomTotalVnd, discountVnd: b.discountVnd, extraTotalVnd: b.extraTotalVnd, cancelFeeVnd: b.cancelFeeVnd, dueVnd: due, paidVnd: paid, balanceVnd: due - paid, createdAt: b.createdAt, hasReview: !!b.review };
  }
  async create(dto: CustomerBookingDto, customerId?: string, actorId?: string) {
    const dates = nights(dto.checkIn, dto.checkOut);
    if (dto.adults > 20) throw new BadRequestException('Invalid party size.');
    const plan = (dto.ratePlan ?? 'FLEXIBLE') as 'FLEXIBLE' | 'NON_REFUNDABLE';
    const guarantee = dto.guaranteeMode ?? 'PAY_AT_HOTEL';
    const fingerprint = sha(JSON.stringify({ ...dto, guestEmail: dto.guestEmail.toLowerCase(), customerId: customerId ?? null, actorId: actorId ?? null }));
    const previous = await this.db.booking.findUnique({ where: { clientRequestId: dto.clientRequestId }, include: bookingInclude });
    if (previous) {
      if (previous.payloadHash !== fingerprint) throw new ConflictException('Request ID already used for different booking data.');
      return { ...(actorId ? this.safeBooking(previous) : this.customerBooking(previous)), lookupToken: bookingLookupToken(previous.code, dto.clientRequestId), idempotentReplay: true };
    }
    const bookingCode = `DGH-${token().slice(0, 12).toUpperCase()}`;
    const lookupToken = bookingLookupToken(bookingCode, dto.clientRequestId);
    try {
      const b = await this.db.$transaction(async (tx) => {
        const type = await tx.roomType.findUnique({ where: { code: dto.roomTypeCode } });
        if (!type || !type.isPublished || type.baseRateVnd <= 0) throw new NotFoundException('Room type is unavailable for booking.');
        if (type.maxGuests < dto.adults + (dto.children ?? 0)) throw new BadRequestException('Party size exceeds maximum occupancy.');
        // All booking and block operations on this type use the same advisory lock.
        await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${type.id}))`;
        const available = await this.hotel.freeRooms(tx, type.id, dates[0], day(dto.checkOut));
        if (available.length === 0) throw new ConflictException('No continuously available physical room for requested dates.');
        if (dto.guaranteeMode === 'HOLD' && dto.extras?.length) throw new BadRequestException('Extras require a confirmed reservation.');
        const quotation = await this.hotel.quote(tx, type.id, dates, plan);
        const extras = await this.extraQuote(tx, dto.extras ?? []);
        let discountVnd = 0;
        if (dto.promotionCode) {
          await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${`promo-${dto.promotionCode}`}))`;
          const promo = await tx.promotion.findUnique({ where: { code: dto.promotionCode } });
          const now = new Date();
          if (!promo || !promo.isActive || promo.startsAt > now || promo.endsAt <= now || promo.usageCount >= promo.usageLimit) {
            throw new BadRequestException('Promotion is invalid, expired, or fully redeemed.');
          }
          discountVnd = roundMoney(quotation.totalVnd * promo.discountPercent / 100);
          await tx.promotion.update({ where: { id: promo.id }, data: { usageCount: { increment: 1 } } });
        }
        assertVnd(quotation.totalVnd);
        const totalVnd = quotation.totalVnd - discountVnd + extras.total;
        assertVnd(totalVnd);
        if (dto.expectedTotalVnd !== undefined && dto.expectedTotalVnd !== totalVnd) throw new ConflictException('Price changed. Please refresh your quote.');
        const account = customerId ? await tx.user.findUnique({ where: { id: customerId } }) : null;
        const associate = Boolean(account && account.email === dto.guestEmail.toLowerCase());
        const guest = associate
          ? await tx.guest.upsert({
            where: { accountId: customerId! }, create: {
              accountId: customerId, name: dto.guestName, email: dto.guestEmail.toLowerCase(), phone: dto.guestPhone,
            }, update: { phone: dto.guestPhone ?? undefined }
          })
          : await tx.guest.create({ data: { name: dto.guestName, email: dto.guestEmail.toLowerCase(), phone: dto.guestPhone } });
        return tx.booking.create({
          data: {
            code: bookingCode, clientRequestId: dto.clientRequestId, payloadHash: fingerprint, lookupTokenHash: sha(lookupToken), guestId: guest.id, roomTypeId: type.id, roomId: available[0].id,
            customerId, checkIn: dates[0], checkOut: day(dto.checkOut), adults: dto.adults, children: dto.children ?? 0,
            ratePlan: plan, specialRequests: dto.specialRequests, status: guarantee === 'HOLD' ? 'PENDING' : 'CONFIRMED',
            holdExpiresAt: guarantee === 'HOLD' ? new Date(Date.now() + HOLD_MINUTES * 60_000) : null,
            roomTotalVnd: quotation.totalVnd, discountVnd, extraTotalVnd: extras.total, totalVnd,
            services: { create: extras.lines.map(line => ({ clientRequestId: sha(`booking-extra:${dto.clientRequestId}:${line.serviceId}`), ...line })) },
            promoCode: dto.promotionCode,
            rateSnapshot: quotation.lines,
          }, include: bookingInclude
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 20_000 });
      if (actorId) await this.audit(actorId, 'CREATE_BOOKING', b.id, { code: b.code });
      return { ...(actorId ? this.safeBooking(b) : this.customerBooking(b)), lookupToken, bookingPolicy: guarantee === 'PAY_AT_HOTEL' ? 'Confirmed, collect payment at hotel' : `${HOLD_MINUTES}-minute unpaid hold; staff must confirm before expiry` };
    } catch (err) {
      if (isSerializationFailure(err)) throw new ConflictException('Inventory changed concurrently; retry with SAME clientRequestId.');
      if (isUnique(err)) {
        const existing = await this.db.booking.findUnique({ where: { clientRequestId: dto.clientRequestId }, include: bookingInclude });
        if (existing && existing.payloadHash === fingerprint) return { ...(actorId ? this.safeBooking(existing) : this.customerBooking(existing)), lookupToken: bookingLookupToken(existing.code, dto.clientRequestId), idempotentReplay: true };
        throw new ConflictException('Duplicate booking or promotion conflict.');
      }
      throw err;
    }
  }

  private async extraQuote(client: Prisma.TransactionClient, extras: NonNullable<BookingQuoteDto['extras']>) {
    if (new Set(extras.map(x => x.serviceCode)).size !== extras.length) throw new BadRequestException('Duplicate extra service.');
    const lines = [];
    for (const extra of extras) {
      const service = await client.extraService.findUnique({ where: { code: extra.serviceCode } });
      if (!service?.isActive) throw new NotFoundException('Service unavailable.');
      const totalVnd = service.priceVnd * extra.quantity;
      assertVnd(totalVnd);
      lines.push({ serviceId: service.id, quantity: extra.quantity, unitPriceVnd: service.priceVnd, totalVnd });
    }
    const total = lines.reduce((sum, line) => sum + line.totalVnd, 0);
    assertVnd(total);
    return { lines, total };
  }

  async quoteBooking(dto: BookingQuoteDto) {
    const dates = nights(dto.checkIn, dto.checkOut);
    const type = await this.db.roomType.findUnique({ where: { code: dto.roomTypeCode } });
    if (!type?.isPublished || type.baseRateVnd <= 0) throw new NotFoundException('Room type is unavailable for booking.');
    if (type.maxGuests < dto.adults + (dto.children ?? 0)) throw new BadRequestException('Party size exceeds maximum occupancy.');
    const free = await this.hotel.freeRooms(this.db, type.id, dates[0], day(dto.checkOut));
    if (!free.length) throw new ConflictException('No continuously available physical room for requested dates.');
    const plan = (dto.ratePlan ?? 'FLEXIBLE') as 'FLEXIBLE' | 'NON_REFUNDABLE';
    const room = await this.hotel.quote(this.db, type.id, dates, plan);
    const extras = await this.extraQuote(this.db, dto.extras ?? []);
    let discountVnd = 0;
    if (dto.promotionCode) {
      const promo = await this.db.promotion.findUnique({ where: { code: dto.promotionCode } });
      const now = new Date();
      if (!promo || !promo.isActive || promo.startsAt > now || promo.endsAt <= now || promo.usageCount >= promo.usageLimit) throw new BadRequestException('Promotion is invalid, expired, or fully redeemed.');
      discountVnd = roundMoney(room.totalVnd * promo.discountPercent / 100);
    }
    assertVnd(room.totalVnd);
    const totalVnd = room.totalVnd - discountVnd + extras.total;
    assertVnd(totalVnd);
    return { roomTotalVnd: room.totalVnd, discountVnd, extraTotalVnd: extras.total, totalVnd, nights: dates.length, availableRooms: free.length };
  }

  async confirm(code: string, actorId: string) {
    const result = await this.db.booking.updateMany({ where: { code, status: 'PENDING', holdExpiresAt: { gt: new Date() } }, data: { status: 'CONFIRMED', holdExpiresAt: null } });
    if (!result.count) throw new ConflictException('Pending hold expired or booking not eligible for confirmation.');
    await this.audit(actorId, 'CONFIRM_BOOKING', code);
    return this.get(code);
  }

  private async requireBooking(code: string) {
    const b = await this.db.booking.findUnique({ where: { code }, include: { room: true, roomType: true } });
    if (!b) throw new NotFoundException('Booking not found.');
    return b;
  }

  async cancel(code: string, dto: CancelBookingDto, actorId?: string, customerId?: string) {
    return this.db.$transaction(async (tx) => {
      let b = await tx.booking.findUnique({ where: { code } });
      if (!b) throw new NotFoundException('Booking not found.');
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${`folio-${b.id}`}))`;
      b = await tx.booking.findUniqueOrThrow({ where: { id: b.id } });
      if (customerId && b.customerId !== customerId && sha(dto.lookupToken ?? '') !== b.lookupTokenHash) throw new ForbiddenException('Booking ownership not verified.');
      if (!customerId && !actorId && sha(dto.lookupToken ?? '') !== b.lookupTokenHash) throw new ForbiddenException('Private booking lookup token required.');
      if (!['PENDING', 'CONFIRMED'].includes(b.status)) throw new ConflictException('Booking cannot be cancelled in its current state.');
      const fulfilled = await tx.serviceOrder.aggregate({ where: { bookingId: b.id, status: 'FULFILLED' }, _sum: { totalVnd: true } });
      const fulfilledVnd = fulfilled._sum.totalVnd ?? 0;
      const roomObligationVnd = Math.max(0, b.roomTotalVnd - b.discountVnd);
      const firstNight = (b.rateSnapshot as { amountVnd: number; }[])[0]?.amountVnd ?? b.roomTotalVnd;
      const cutoff = new Date(b.checkIn.valueOf() + (14 - 7 - 48) * 3600_000);
      const roomFee = b.status === 'PENDING' ? 0 : b.ratePlan === 'NON_REFUNDABLE' ? roomObligationVnd : new Date() < cutoff ? 0 : Math.min(firstNight, roomObligationVnd);
      const fee = roomFee + fulfilledVnd;
      await tx.serviceOrder.updateMany({ where: { bookingId: b.id, status: 'REQUESTED' }, data: { status: 'CANCELLED' } });
      const result = await tx.booking.updateMany({ where: { id: b.id, status: b.status }, data: { status: 'CANCELLED', cancelFeeVnd: fee } });
      if (!result.count) throw new ConflictException('Booking status has changed.');
      await tx.auditLog.create({ data: { actorId: actorId ?? customerId ?? null, operation: 'CANCEL_BOOKING', entity: 'Booking', entityId: b.id, detail: { reason: dto.reason, feeVnd: fee } } });
      const paid = await tx.paymentTransaction.aggregate({ where: { bookingId: b.id, kind: 'PAYMENT' }, _sum: { amountVnd: true } });
      const refunds = await tx.paymentTransaction.aggregate({ where: { bookingId: b.id, kind: 'REFUND' }, _sum: { amountVnd: true } });
      const netPaid = (paid._sum.amountVnd ?? 0) - (refunds._sum.amountVnd ?? 0);
      return { code, status: 'CANCELLED', cancellationFeeVnd: fee, refundDueVnd: Math.max(0, netPaid - fee), message: 'Cancellation recorded; refunds are manual separate transactions.' };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async assignRoom(code: string, dto: AssignRoomDto, actorId: string) {
    const b = await this.requireBooking(code);
    if (!['CONFIRMED', 'CHECKED_IN'].includes(b.status)) throw new ConflictException('Cannot assign room at current booking status.');
    const result = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${b.roomTypeId}))`;
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${`folio-${b.id}`}))`;
      const current = await tx.booking.findUniqueOrThrow({ where: { id: b.id } });
      if (current.status !== b.status || current.roomId !== b.roomId || current.checkOut.valueOf() !== b.checkOut.valueOf()) throw new ConflictException('Booking status has changed.');
      const candidate = await tx.physicalRoom.findUnique({ where: { number: dto.roomNumber } });
      if (!candidate || candidate.roomTypeId !== b.roomTypeId || !candidate.sellable) throw new ConflictException('Room is not eligible for this room type.');
      if (candidate.cleaningStatus !== 'INSPECTED') throw new ConflictException('Assigned room must be Inspected.');
      const free = await this.hotel.freeRooms(tx, b.roomTypeId, b.checkIn, b.checkOut, b.id);
      if (b.status === 'CHECKED_IN' && await tx.booking.count({ where: { roomId: candidate.id, status: 'CHECKED_IN', id: { not: b.id } } })) throw new ConflictException('Room is still occupied.');
      if (!free.some((r) => r.id === candidate.id)) throw new ConflictException('Room already reserved or blocked for these dates.');
      const updated = await tx.booking.update({ where: { id: b.id }, data: { roomId: candidate.id } });
      if (b.status === 'CHECKED_IN' && b.roomId !== candidate.id) {
        await tx.physicalRoom.update({ where: { id: b.roomId }, data: { cleaningStatus: 'DIRTY' } });
      }
      await tx.auditLog.create({ data: { actorId, entity: 'Booking', entityId: b.id, operation: 'CHANGE_ROOM', detail: { from: b.room.number, to: dto.roomNumber, reason: dto.reason } } });
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return this.get(result.code);
  }

  async checkIn(code: string, actorId: string) {
    const b = await this.requireBooking(code);
    if (b.status !== 'CONFIRMED') throw new ConflictException('Only confirmed bookings can check in.');
    if (b.checkIn.toISOString().slice(0, 10) > hotelToday()) throw new ConflictException('Early check-in requires an approved date change.');
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${b.roomTypeId}))`;
      const current = await tx.booking.findUnique({ where: { id: b.id }, include: { room: true } });
      if (!current || current.status !== 'CONFIRMED') throw new ConflictException('Booking already changed.');
      if (current.checkOut.toISOString().slice(0, 10) <= hotelToday()) throw new ConflictException('Stay dates have ended.');
      const occupied = await tx.booking.count({ where: { roomId: current.roomId, status: 'CHECKED_IN', id: { not: current.id } } });
      if (occupied) throw new ConflictException('Room is still occupied.');
      if (current.room.cleaningStatus !== 'INSPECTED' || !current.room.sellable) throw new ConflictException('Room not inspected or not sellable.');
      const blocks = await tx.maintenanceBlock.count({ where: { roomId: current.roomId, startDate: { lt: current.checkOut }, endDate: { gt: current.checkIn } } });
      if (blocks) throw new ConflictException('Room currently blocked for maintenance.');
      await tx.booking.update({ where: { id: current.id }, data: { status: 'CHECKED_IN', checkedInAt: new Date() } });
      await tx.auditLog.create({ data: { actorId, operation: 'CHECK_IN', entity: 'Booking', entityId: b.id, detail: { roomNumber: current.room.number } } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return this.get(code);
  }

  async checkOut(code: string, actorId: string) {
    const b = await this.requireBooking(code);
    if (b.status !== 'CHECKED_IN') throw new ConflictException('Only in-house guests can check out.');
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${`folio-${b.id}`}))`;
      const current = await tx.booking.findUniqueOrThrow({ where: { id: b.id } });
      if (current.status !== 'CHECKED_IN') throw new ConflictException('Booking already checked out.');
      const pending = await tx.serviceOrder.count({ where: { bookingId: b.id, status: 'REQUESTED' } });
      if (pending) throw new ConflictException('Resolve pending service orders before checkout.');
      const payments = await tx.paymentTransaction.findMany({ where: { bookingId: b.id } });
      const received = payments.reduce((sum, item) => sum + (item.kind === 'PAYMENT' ? item.amountVnd : -item.amountVnd), 0);
      if (received !== current.totalVnd) throw new ConflictException(`Outstanding folio balance: ${current.totalVnd - received} VND. Collect or settle before checkout.`);
      const updated = await tx.booking.updateMany({ where: { id: b.id, status: 'CHECKED_IN' }, data: { status: 'CHECKED_OUT', checkedOutAt: new Date() } });
      if (!updated.count) throw new ConflictException('Booking already checked out.');
      await tx.physicalRoom.update({ where: { id: current.roomId }, data: { cleaningStatus: 'DIRTY' } });
      await tx.auditLog.create({ data: { actorId, operation: 'CHECK_OUT', entity: 'Booking', entityId: b.id } });
      return { code, status: 'CHECKED_OUT', cleaningStatus: 'DIRTY', folioBalanceVnd: 0 };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async noShow(code: string, dto: NoShowDto, actorId: string) {
    const b = await this.requireBooking(code);
    if (b.status !== 'CONFIRMED') throw new ConflictException('No-show only applies to confirmed arrivals.');
    if (hotelToday() <= b.checkIn.toISOString().slice(0, 10)) throw new ConflictException('No-show cutoff: 00:00 hotel local time on day after arrival.');
    if (b.expectedArrivalAt && b.expectedArrivalAt > new Date()) throw new ConflictException('Late-arrival guarantee is still active.');
    const fee = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${`folio-${b.id}`}))`;
      const current = await tx.booking.findUniqueOrThrow({ where: { id: b.id } });
      if (current.status !== 'CONFIRMED' || (current.expectedArrivalAt && current.expectedArrivalAt > new Date())) throw new ConflictException('Booking status has changed.');
      const firstNight = (current.rateSnapshot as { amountVnd: number; }[])[0]?.amountVnd ?? current.roomTotalVnd;
      const fulfilled = await tx.serviceOrder.aggregate({ where: { bookingId: b.id, status: 'FULFILLED' }, _sum: { totalVnd: true } });
      const roomObligation = Math.max(0, current.roomTotalVnd - current.discountVnd);
      const feeVnd = (current.ratePlan === 'NON_REFUNDABLE' ? roomObligation : Math.min(firstNight, roomObligation)) + (fulfilled._sum.totalVnd ?? 0);
      const changed = await tx.booking.updateMany({ where: { id: b.id, status: 'CONFIRMED' }, data: { status: 'NO_SHOW', cancelFeeVnd: feeVnd } });
      if (!changed.count) throw new ConflictException('Status already changed.');
      await tx.serviceOrder.updateMany({ where: { bookingId: b.id, status: 'REQUESTED' }, data: { status: 'CANCELLED' } });
      await tx.auditLog.create({ data: { actorId, operation: 'MARK_NO_SHOW', entity: 'Booking', entityId: b.id, detail: { feeVnd, reason: dto.reason } } });
      return feeVnd;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return { code, status: 'NO_SHOW', noShowFeeVnd: fee, message: 'Release inventory; process any refundable balance separately.' };
  }

  async noteLateArrival(code: string, dto: LateArrivalDto, actorId: string) {
    const b = await this.requireBooking(code);
    if (b.status !== 'CONFIRMED') throw new ConflictException('Only confirmed arrivals can specify late arrival.');
    const expected = new Date(dto.expectedArrivalAt);
    const checkOutLocal = new Date(b.checkOut.valueOf() - 7 * 3600_000 + 12 * 3600_000);
    if (!Number.isFinite(expected.valueOf()) || expected < new Date() || expected >= checkOutLocal) {
      throw new BadRequestException('Expected arrival must be in future and before check-out.');
    }
    await this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${`folio-${b.id}`}))`;
      const result = await tx.booking.updateMany({ where: { id: b.id, status: 'CONFIRMED' }, data: { expectedArrivalAt: expected } });
      if (!result.count) throw new ConflictException('Booking status has changed.');
      await tx.auditLog.create({ data: { actorId, operation: 'EXPECTED_LATE_ARRIVAL', entity: 'Booking', entityId: b.id, detail: { expectedArrivalAt: expected.toISOString(), reason: dto.reason } } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return this.get(code);
  }

  async extend(code: string, dto: ExtendStayDto, actorId: string) {
    const b = await this.requireBooking(code);
    if (!['CONFIRMED', 'CHECKED_IN'].includes(b.status)) throw new ConflictException('Booking cannot be extended.');
    if (dto.checkOut <= b.checkOut.toISOString().slice(0, 10)) throw new BadRequestException('Extension date must be later.');
    nights(b.checkIn.toISOString().slice(0, 10), dto.checkOut, true);
    const extraDates = nights(b.checkOut.toISOString().slice(0, 10), dto.checkOut, true);
    const result = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${b.roomTypeId}))`;
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${`folio-${b.id}`}))`;
      const current = await tx.booking.findUniqueOrThrow({ where: { id: b.id } });
      if (current.status !== b.status || current.roomId !== b.roomId || current.checkOut.valueOf() !== b.checkOut.valueOf()) throw new ConflictException('Booking status has changed.');
      const rooms = await this.hotel.freeRooms(tx, b.roomTypeId, b.checkOut, day(dto.checkOut), b.id);
      if (!rooms.some((room) => room.id === b.roomId)) throw new ConflictException('Assigned room is unavailable for extension.');
      const extra = await this.hotel.quote(tx, b.roomTypeId, extraDates, b.ratePlan);
      assertVnd(current.roomTotalVnd + extra.totalVnd); assertVnd(current.totalVnd + extra.totalVnd);
      const rateSnapshot = [...(current.rateSnapshot as { date: string; amountVnd: number; }[]), ...extra.lines];
      const updated = await tx.booking.update({
        where: { id: b.id }, data: {
          checkOut: day(dto.checkOut), roomTotalVnd: current.roomTotalVnd + extra.totalVnd,
          totalVnd: current.totalVnd + extra.totalVnd, rateSnapshot,
        }
      });
      await tx.auditLog.create({ data: { actorId, operation: 'EXTEND_STAY', entity: 'Booking', entityId: b.id, detail: { newCheckOut: dto.checkOut, extraTotalVnd: extra.totalVnd } } });
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return this.get(result.code);
  }

  async frontDesk() {
    await this.expirePendingHolds();
    const today = hotelToday();
    const all = await this.db.booking.findMany({ where: { status: { in: [...ACTIVE] } }, include: bookingInclude });
    const rows = all.map((b) => this.safeBooking(b));
    return {
      date: today,
      arrivals: rows.filter((b) => b.status === 'CONFIRMED' && b.checkIn.toISOString().slice(0, 10) <= today),
      inHouse: rows.filter((b) => b.status === 'CHECKED_IN'),
      departures: rows.filter((b) => b.status === 'CHECKED_IN' && b.checkOut.toISOString().slice(0, 10) <= today),
    };
  }

  private async expirePendingHolds(): Promise<void> {
    await this.db.booking.updateMany({ where: { status: 'PENDING', holdExpiresAt: { lte: new Date() } }, data: { status: 'EXPIRED' } });
  }

  private audit(actorId: string | undefined, operation: string, entityId: string, detail?: object) {
    return this.db.auditLog.create({ data: { actorId, operation, entity: 'Booking', entityId, ...(detail ? { detail } : {}) } });
  }
}
