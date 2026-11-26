import { createWithCode, normalizeCatalogCode, promotionCode } from './catalog-code';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ExtraServiceDto, FolioAdjustmentDto, ManualPaymentDto, ManualRefundDto, PromotionDto, ReviewDto, ReviewResponseDto, ServiceOrderDto } from './contracts';
import { assertVnd } from './util';
@Injectable()
export class FinanceService {
  constructor(private readonly db: PrismaService) { }
  private async getBooking(code: string) {
    const b = await this.db.booking.findUnique({ where: { code } });
    if (!b)
      throw new NotFoundException('Booking not found.');
    return b;
  }
  private sums(txs: {
    kind: string;
    amountVnd: number;
  }[]) {
    const received = txs.filter((t) => t.kind === 'PAYMENT').reduce((a, b) => a + b.amountVnd, 0);
    const refunded = txs.filter((t) => t.kind === 'REFUND').reduce((a, b) => a + b.amountVnd, 0);
    return { received, refunded, netReceived: received - refunded };
  }
  async folio(code: string) {
    const b = await this.db.booking.findUnique({ where: { code }, include: { payments: { orderBy: { createdAt: 'asc' } }, adjustments: true, services: { include: { service: true } } } });
    if (!b)
      throw new NotFoundException('Booking not found.');
    const dueVnd = ['CANCELLED', 'NO_SHOW', 'EXPIRED'].includes(b.status) ? b.cancelFeeVnd : b.totalVnd;
    const totals = this.sums(b.payments);
    const balanceVnd = dueVnd - totals.netReceived;
    const paymentStatus = totals.refunded > 0 ? (totals.netReceived <= 0 ? 'REFUNDED' : 'PARTIALLY_REFUNDED') :
      totals.netReceived <= 0 ? 'UNPAID' : balanceVnd <= 0 ? 'PAID' : 'PARTIALLY_PAID';
    return {
      code, bookingStatus: b.status, dueVnd, roomTotalVnd: b.roomTotalVnd, discountVnd: b.discountVnd,
      extraTotalVnd: b.extraTotalVnd, cancellationFeeVnd: b.cancelFeeVnd, ...totals, balanceVnd, paymentStatus,
      services: b.services, adjustments: b.adjustments, transactions: b.payments
    };
  }
  async adjustFolio(code: string, dto: FolioAdjustmentDto, actorId: string) {
    if (dto.amountVnd === 0)
      throw new BadRequestException('Adjustment cannot be zero.');
    const booking = await this.getBooking(code);
    if (['CANCELLED', 'NO_SHOW', 'EXPIRED'].includes(booking.status))
      throw new ConflictException('Cannot adjust cancelled, expired, or no-show booking.');
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${`folio-${booking.id}`}))`;
      if (dto.idempotencyKey) {
        const previous = await tx.folioAdjustment.findUnique({ where: { idempotencyKey: dto.idempotencyKey } });
        if (previous) {
          if (previous.bookingId === booking.id && previous.amountVnd === dto.amountVnd && previous.reason === dto.reason)
            return;
          throw new ConflictException('Idempotency key already used for a different operation.');
        }
      }
      const current = await tx.booking.findUnique({ where: { id: booking.id } });
      if (!current || !['PENDING', 'CONFIRMED', 'CHECKED_IN'].includes(current.status) || current.totalVnd + dto.amountVnd < 0)
        throw new ConflictException('Adjustment would make folio negative.');
      assertVnd(current.totalVnd + dto.amountVnd);
      await tx.folioAdjustment.create({ data: { bookingId: booking.id, amountVnd: dto.amountVnd, reason: dto.reason, actorId, idempotencyKey: dto.idempotencyKey } });
      await tx.booking.update({ where: { id: booking.id }, data: { totalVnd: { increment: dto.amountVnd } } });
      await tx.auditLog.create({ data: { actorId, operation: 'FOLIO_ADJUSTMENT', entity: 'Booking', entityId: booking.id, detail: { amountVnd: dto.amountVnd, reason: dto.reason } } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return this.folio(code);
  }
  payments() { return this.db.paymentTransaction.findMany({ include: { booking: { select: { code: true } } }, orderBy: { createdAt: 'desc' } }); }
  async recordPayment(code: string, dto: ManualPaymentDto, actorId: string) {
    const b = await this.getBooking(code);
    if (['EXPIRED'].includes(b.status))
      throw new ConflictException('Cannot receive payment for expired hold.');
    if (dto.method === 'BANK_TRANSFER' && !dto.reference?.trim())
      throw new BadRequestException('Bank reference is required for bank transfers.');
    const existed = await this.db.paymentTransaction.findUnique({ where: { idempotencyKey: dto.idempotencyKey } });
    if (existed) {
      if (existed.bookingId === b.id && existed.kind === 'PAYMENT' && existed.amountVnd === dto.amountVnd && existed.method === dto.method && (existed.reference ?? '') === (dto.reference ?? '') && (existed.note ?? '') === (dto.note ?? ''))
        return this.folio(code);
      throw new ConflictException('Idempotency key already used for a different operation.');
    }
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${`folio-${b.id}`}))`;
      const current = await tx.booking.findUniqueOrThrow({ where: { id: b.id } });
      const transactions = await tx.paymentTransaction.findMany({ where: { bookingId: b.id } });
      const totals = this.sums(transactions);
      if (current.status === 'EXPIRED' || (current.status === 'PENDING' && current.holdExpiresAt && current.holdExpiresAt <= new Date()))
        throw new ConflictException('Cannot receive payment for expired hold.');
      const due = ['CANCELLED', 'NO_SHOW'].includes(current.status) ? current.cancelFeeVnd : current.totalVnd;
      if (dto.amountVnd > due - totals.netReceived)
        throw new ConflictException('Payment exceeds outstanding folio balance.');
      await tx.paymentTransaction.create({
        data: {
          bookingId: b.id, kind: 'PAYMENT', method: dto.method as 'CASH' | 'BANK_TRANSFER',
          amountVnd: dto.amountVnd, idempotencyKey: dto.idempotencyKey, reference: dto.reference,
          note: dto.note, actorId,
        }
      });
      await tx.auditLog.create({ data: { actorId, operation: 'RECORD_MANUAL_PAYMENT', entity: 'Booking', entityId: b.id, detail: { amountVnd: dto.amountVnd, method: dto.method } } });
      return { code, recorded: true };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }).then(() => this.folio(code));
  }
  async recordRefund(code: string, dto: ManualRefundDto, actorId: string) {
    const b = await this.getBooking(code);
    if (!dto.externallyCompleted)
      throw new BadRequestException('The actual refund must be completed and verified before recording it.');
    if (dto.method === 'BANK_TRANSFER' && !dto.reference?.trim())
      throw new BadRequestException('Bank refund reference is required.');
    const existing = await this.db.paymentTransaction.findUnique({ where: { idempotencyKey: dto.idempotencyKey } });
    if (existing) {
      if (existing.bookingId === b.id && existing.kind === 'REFUND' && existing.amountVnd === dto.amountVnd && existing.method === dto.method && (existing.reference ?? '') === (dto.reference ?? '') && (existing.note ?? '') === (dto.note ?? ''))
        return this.folio(code);
      throw new ConflictException('Idempotency key conflict.');
    }
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${`folio-${b.id}`}))`;
      const current = await tx.booking.findUniqueOrThrow({ where: { id: b.id } });
      const transactions = await tx.paymentTransaction.findMany({ where: { bookingId: b.id } });
      const totals = this.sums(transactions);
      const due = ['CANCELLED', 'NO_SHOW', 'EXPIRED'].includes(current.status) ? current.cancelFeeVnd : current.totalVnd;
      if (dto.amountVnd > Math.max(0, totals.netReceived - due))
        throw new ConflictException('Refund exceeds refundable overpayment. Cancel/adjust the booking first if appropriate.');
      await tx.paymentTransaction.create({ data: { bookingId: b.id, kind: 'REFUND', method: dto.method as 'CASH' | 'BANK_TRANSFER', amountVnd: dto.amountVnd, idempotencyKey: dto.idempotencyKey, reference: dto.reference, note: dto.note, actorId } });
      await tx.auditLog.create({ data: { actorId, operation: 'RECORD_MANUAL_REFUND', entity: 'Booking', entityId: b.id, detail: { amountVnd: dto.amountVnd, method: dto.method } } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return this.folio(code);
  }
  services() { return this.db.extraService.findMany({ orderBy: { code: 'asc' } }); }
  async createService(dto: ExtraServiceDto) {
    const { code, ...data } = dto;
    return createWithCode({
      explicit: code, base: normalizeCatalogCode(dto.name, 'service'), separator: '_',
      create: (generatedCode) => this.db.extraService.create({ data: { ...data, code: generatedCode } }),
      conflictMessage: 'Service code already exists.'
    });
  }
  async orderService(code: string, dto: ServiceOrderDto, actorId: string) {
    const b = await this.getBooking(code);
    const existing = await this.db.serviceOrder.findUnique({ where: { clientRequestId: dto.clientRequestId } });
    if (existing) {
      if (existing.bookingId === b.id && existing.quantity === dto.quantity && (await this.db.extraService.findUnique({ where: { code: dto.serviceCode } }))?.id === existing.serviceId)
        return { order: existing, folio: await this.folio(code), idempotentReplay: true };
      throw new ConflictException('Service request ID already used for another operation.');
    }
    if (!['CONFIRMED', 'CHECKED_IN'].includes(b.status))
      throw new ConflictException('Services can only be added to confirmed/in-house stays.');
    const service = await this.db.extraService.findUnique({ where: { code: dto.serviceCode } });
    if (!service || !service.isActive)
      throw new NotFoundException('Service unavailable.');
    const amount = service.priceVnd * dto.quantity;
    if (!Number.isSafeInteger(amount) || amount > 2000000000)
      throw new BadRequestException('Service charge exceeds limit.');
    const order = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${`folio-${b.id}`}))`;
      const current = await tx.booking.findUnique({ where: { id: b.id } });
      if (!current || !['CONFIRMED', 'CHECKED_IN'].includes(current.status))
        throw new ConflictException('Stay is closed; cannot add service.');
      assertVnd(current.totalVnd + amount);
      const order = await tx.serviceOrder.create({ data: { clientRequestId: dto.clientRequestId, bookingId: b.id, serviceId: service.id, quantity: dto.quantity, unitPriceVnd: service.priceVnd, totalVnd: amount } });
      await tx.booking.update({ where: { id: b.id }, data: { extraTotalVnd: { increment: amount }, totalVnd: { increment: amount } } });
      await tx.auditLog.create({ data: { actorId, operation: 'ORDER_SERVICE', entity: 'Booking', entityId: b.id, detail: { service: service.code, amount } } });
      return order;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return { order, folio: await this.folio(code) };
  }
  async updateServiceOrder(id: string, status: 'FULFILLED' | 'CANCELLED', actorId: string) {
    const order = await this.db.serviceOrder.findUnique({ where: { id }, include: { booking: true } });
    if (!order)
      throw new NotFoundException('Service order not found.');
    if (order.status !== 'REQUESTED')
      throw new ConflictException('Only requested services may be fulfilled or cancelled.');
    if (order.booking.status === 'CHECKED_OUT')
      throw new ConflictException('Stay is closed.');
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${`folio-${order.bookingId}`}))`;
      const current = await tx.booking.findUniqueOrThrow({ where: { id: order.bookingId } });
      if (!['CONFIRMED', 'CHECKED_IN'].includes(current.status))
        throw new ConflictException('Stay is closed.');
      const changed = await tx.serviceOrder.updateMany({ where: { id, status: 'REQUESTED' }, data: { status } });
      if (!changed.count)
        throw new ConflictException('Service order was already processed.');
      if (status === 'CANCELLED' && current.totalVnd < order.totalVnd)
        throw new ConflictException('Reverse the folio credit before cancelling this service.');
      if (status === 'CANCELLED')
        await tx.booking.update({ where: { id: order.bookingId }, data: { extraTotalVnd: { decrement: order.totalVnd }, totalVnd: { decrement: order.totalVnd } } });
      await tx.auditLog.create({ data: { actorId, operation: `SERVICE_${status}`, entity: 'ServiceOrder', entityId: id } });
      return tx.serviceOrder.findUniqueOrThrow({ where: { id } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
  async setPromotionActive(code: string, isActive: boolean, actorId: string) { return this.db.$transaction(async (tx) => { await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${`promo-${code}`}))`; const record = await tx.promotion.update({ where: { code }, data: { isActive } }); await tx.auditLog.create({ data: { actorId, operation: 'PROMOTION_ACTIVE', entity: 'Promotion', entityId: record.id, detail: { isActive } } }); return record; }); }
  async setServiceActive(code: string, isActive: boolean, actorId: string) { return this.db.$transaction(async (tx) => { const record = await tx.extraService.update({ where: { code }, data: { isActive } }); await tx.auditLog.create({ data: { actorId, operation: 'SERVICE_ACTIVE', entity: 'ExtraService', entityId: record.id, detail: { isActive } } }); return record; }); }
  promotions() { return this.db.promotion.findMany({ orderBy: { createdAt: 'desc' } }); }
  async generatePromotionCode() {
    for (let attempt = 0; attempt < 100; attempt++) {
      const code = promotionCode();
      if (!(await this.db.promotion.findUnique({ where: { code }, select: { id: true } })))
        return { code };
    }
    throw new ConflictException('Promotion code already exists.');
  }
  async createPromotion(dto: PromotionDto) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (!Number.isFinite(startsAt.valueOf()) || !Number.isFinite(endsAt.valueOf()) || endsAt <= startsAt)
      throw new BadRequestException('Invalid promotion period.');
    const { code, ...data } = dto;
    return createWithCode({
      explicit: code,
      create: (generatedCode) => this.db.promotion.create({ data: { ...data, code: generatedCode, startsAt, endsAt } }),
      conflictMessage: 'Promotion code already exists.'
    });
  }
  async guests() {
    const guests = await this.db.guest.findMany({ include: { bookings: { select: { code: true, status: true, totalVnd: true } } }, orderBy: { createdAt: 'desc' } });
    return guests.map((g) => ({ ...g, stays: g.bookings.filter((b) => b.status === 'CHECKED_OUT').length }));
  }
  async publicReviews() {
    const rows = await this.db.review.findMany({ where: { isVisible: true }, select: { id: true, stars: true, comment: true, response: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 100 });
    return rows;
  }
  reviews() { return this.db.review.findMany({ include: { booking: { select: { code: true, guest: { select: { name: true } } } } }, orderBy: { createdAt: 'desc' } }); }
  async review(code: string, dto: ReviewDto, customerId?: string) {
    const b = await this.db.booking.findUnique({ where: { code } });
    if (!b || (!(customerId && b.customerId === customerId) && b.lookupTokenHash !== (await import('./util.js')).sha(dto.lookupToken ?? ''))) {
      throw new NotFoundException('Booking not found.');
    }
    if (b.status !== 'CHECKED_OUT')
      throw new ConflictException('Reviews require a completed stay.');
    if (await this.db.review.findUnique({ where: { bookingId: b.id } }))
      throw new ConflictException('This stay already has a review.');
    return this.db.review.create({ data: { bookingId: b.id, stars: dto.stars, comment: dto.comment.trim() } });
  }
  async reviewResponse(id: string, dto: ReviewResponseDto, actorId: string) {
    const r = await this.db.review.findUnique({ where: { id } });
    if (!r)
      throw new NotFoundException('Review not found.');
    const updated = await this.db.review.update({ where: { id }, data: { response: dto.response, isVisible: dto.isVisible } });
    await this.db.auditLog.create({ data: { actorId, operation: 'RESPOND_REVIEW', entity: 'Review', entityId: id } });
    return updated;
  }
}
