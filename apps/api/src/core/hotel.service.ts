import { createWithCode, normalizeCatalogCode } from './catalog-code';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { SearchDatesDto, SetDailyRateDto, SetRoomTypeDto, PatchRoomTypeDto, PatchPhysicalRoomDto } from './contracts';
import { day, hotelToday, isUnique, nights, assertVnd, isSerializationFailure } from './util';
import { CreateMaintenanceBlockDto, CreatePhysicalRoomDto, UpdateHotelDto, UpdateHousekeepingDto } from '../modules/admin/dto/admin-contract.dto';
import { defaultPolicy, resolveNight, planAmount, type Policy, type PlanCode } from './pricing-rules';
import { WeekendPricingDto, SpecialRateDto, RatePolicyDto } from './pricing.dto';
type Db = Prisma.TransactionClient;
const ACTIVE = ['CONFIRMED', 'CHECKED_IN'] as const;
@Injectable()
export class HotelService {
  constructor(private readonly db: PrismaService) { }
  async hotel() {
    return this.db.hotelSettings.upsert({ where: { id: 'dylan-grand-hotel' }, create: { id: 'dylan-grand-hotel' }, update: {} });
  }
  async updateHotel(dto: UpdateHotelDto, actorId: string) {
    const record = await this.db.hotelSettings.upsert({ where: { id: 'dylan-grand-hotel' }, create: { id: 'dylan-grand-hotel', ...dto }, update: dto });
    await this.db.auditLog.create({ data: { actorId, operation: 'UPDATE_HOTEL', entity: 'HotelSettings', entityId: record.id } });
    return record;
  }
  async roomTypes(publicOnly = false) {
    return this.db.roomType.findMany({ where: publicOnly ? { isPublished: true } : {}, orderBy: { code: 'asc' }, include: { _count: { select: { physicalRooms: true } } } });
  }
  async roomType(code: string, publicOnly = false) {
    const value = await this.db.roomType.findUnique({ where: { code }, include: { _count: { select: { physicalRooms: true } } } });
    if (!value || (publicOnly && !value.isPublished))
      throw new NotFoundException('Room type not found.');
    return value;
  }
  async createRoomType(dto: SetRoomTypeDto) {
    if (dto.isPublished && dto.baseRateVnd < 1)
      throw new BadRequestException('Positive base rate required to publish.');
    assertVnd(dto.baseRateVnd);
    const weekend = await this.weekend();
    assertVnd(dto.baseRateVnd + (weekend.enabled ? weekend.surchargeVnd : 0));
    const { code, ...data } = dto;
    return createWithCode({
      explicit: code, base: normalizeCatalogCode(dto.nameEn, 'room'), separator: '-',
      create: (generatedCode) => this.db.roomType.create({ data: { ...data, code: generatedCode } }),
      conflictMessage: 'Room type code already exists.'
    });
  }
  async patchRoomType(code: string, dto: PatchRoomTypeDto, actorId: string) {
    const previous = await this.roomType(code);
    if (dto.isPublished && previous.baseRateVnd <= 0)
      throw new BadRequestException('Set a positive base rate before publishing.');
    const updated = await this.db.roomType.update({ where: { code }, data: dto });
    await this.db.auditLog.create({ data: { actorId, operation: 'UPDATE_ROOM_TYPE', entity: 'RoomType', entityId: updated.id, detail: { code, isPublished: updated.isPublished } } });
    return updated;
  }
  async physicalRooms() {
    return this.db.physicalRoom.findMany({ orderBy: { number: 'asc' }, include: { roomType: { select: { code: true, nameEn: true, nameVi: true } } } });
  }
  async physicalRoom(number: string) {
    const value = await this.db.physicalRoom.findUnique({ where: { number }, include: { roomType: { select: { code: true, nameEn: true, nameVi: true } } } });
    if (!value)
      throw new NotFoundException('Physical room not found.');
    return value;
  }
  async createPhysicalRoom(dto: CreatePhysicalRoomDto) {
    const type = await this.db.roomType.findUnique({ where: { code: dto.roomTypeCode } });
    if (!type)
      throw new NotFoundException('Room type not found.');
    try {
      return await this.db.physicalRoom.create({ data: { number: dto.number, floor: dto.floor, roomTypeId: type.id } });
    }
    catch (error) {
      if (isUnique(error))
        throw new ConflictException('Physical room number already exists.');
      throw error;
    }
  }
  async patchPhysicalRoom(number: string, dto: PatchPhysicalRoomDto) {
    const room = await this.physicalRoom(number);
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${room.roomTypeId}))`;
      if (dto.sellable === false) {
        const existing = await tx.booking.count({
          where: {
            roomId: room.id, OR: [{ status: 'CHECKED_IN' }, { checkOut: { gt: day(hotelToday()) }, OR: [{ status: 'CONFIRMED' }, { status: 'PENDING', holdExpiresAt: { gt: new Date() } }] }],
          }
        });
        if (existing > 0)
          throw new ConflictException('Room has upcoming/active reservations; relocate them first.');
      }
      return tx.physicalRoom.update({ where: { number }, data: dto });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
  async updateCleaning(number: string, dto: UpdateHousekeepingDto, actorId: string) {
    const room = await this.physicalRoom(number);
    const old = room.cleaningStatus;
    const valid = old === dto.status ||
      (old === 'DIRTY' && dto.status === 'CLEAN') ||
      (old === 'CLEAN' && dto.status === 'INSPECTED') ||
      (dto.status === 'DIRTY');
    if (!valid)
      throw new ConflictException(`Invalid housekeeping transition ${old} → ${dto.status}.`);
    return this.db.$transaction(async (tx) => {
      const changed = await tx.physicalRoom.updateMany({ where: { number, cleaningStatus: old }, data: { cleaningStatus: dto.status } });
      if (!changed.count)
        throw new ConflictException('Data changed concurrently. Please try again.');
      await tx.auditLog.create({ data: { actorId, operation: 'HOUSEKEEPING_STATUS', entity: 'PhysicalRoom', entityId: room.id, detail: { from: old, to: dto.status } } });
      return tx.physicalRoom.findUniqueOrThrow({ where: { number } });
    });
  }
  housekeeping() { return this.db.physicalRoom.findMany({ select: { number: true, floor: true, cleaningStatus: true, sellable: true }, orderBy: { number: 'asc' } }); }
  async setBaseRate(code: string, amountVnd: number, actorId: string) {
    await this.roomType(code);
    if (amountVnd < 1)
      throw new BadRequestException('Base rate must be positive.');
    assertVnd(amountVnd);
    return this.pricingWrite(async tx => {
      const weekend = await this.weekend(tx);
      assertVnd(amountVnd + (weekend.enabled ? weekend.surchargeVnd : 0));
      const updated = await tx.roomType.update({ where: { code }, data: { baseRateVnd: amountVnd } });
      await tx.auditLog.create({ data: { actorId, operation: 'SET_BASE_RATE', entity: 'RoomType', entityId: updated.id, detail: { code, amountVnd } } });
      return updated;
    });
  }
  async setDailyRate(code: string, dto: SetDailyRateDto, actorId: string) {
    const type = await this.roomType(code);
    day(dto.date);
    if (dto.date < hotelToday()) throw new BadRequestException('Cannot change past rates.');
    assertVnd(dto.amountVnd);
    if (dto.amountVnd < 1)
      throw new BadRequestException('Daily rate must be positive.');
    return this.pricingWrite(async tx => {
      const existing = await tx.dailyRate.findUnique({ where: { roomTypeId_date: { roomTypeId: type.id, date: day(dto.date) } } });
      if (existing?.periodId) throw new ConflictException('Edit the special rate period instead.');
      const updated = await tx.dailyRate.upsert({
        where: { roomTypeId_date: { roomTypeId: type.id, date: day(dto.date) } },
        create: { roomTypeId: type.id, date: day(dto.date), amountVnd: dto.amountVnd },
        update: { amountVnd: dto.amountVnd },
      });
      await tx.auditLog.create({ data: { actorId, operation: 'SET_DAILY_RATE', entity: 'DailyRate', entityId: updated.id, detail: { code, date: dto.date, amountVnd: dto.amountVnd } } });
      return updated;
    });
  }
  private async pricingWrite<T>(work: (tx: Db) => Promise<T>): Promise<T> {
    try {
      return await this.db.$transaction(async tx => {
        await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext('hotel-pricing'))`;
        return work(tx);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 20_000 });
    } catch (error) {
      if (isUnique(error) || isSerializationFailure(error)) throw new ConflictException('Pricing changed or dates overlap. Refresh and retry.');
      throw error;
    }
  }
  async weekend(client: Db = this.db) {
    const settings = await client.hotelSettings.findUnique({ where: { id: 'dylan-grand-hotel' } });
    return { enabled: settings?.weekendEnabled ?? true, surchargeVnd: settings?.weekendSurchargeVnd ?? 1000000 };
  }
  async ratePlans(client: Db = this.db) {
    const plans = await client.ratePlanPolicy.findMany();
    return (['FLEXIBLE', 'NON_REFUNDABLE'] as const).map(code => plans.find(p => p.code === code) ?? defaultPolicy(code));
  }
  async setWeekend(dto: WeekendPricingDto, actorId: string) {
    return this.pricingWrite(async tx => {
      const maximum = await tx.roomType.aggregate({ _max: { baseRateVnd: true } });
      assertVnd((maximum._max.baseRateVnd ?? 0) + (dto.enabled ? dto.surchargeVnd : 0));
      const data = { weekendEnabled: dto.enabled, weekendSurchargeVnd: dto.surchargeVnd };
      await tx.hotelSettings.upsert({ where: { id: 'dylan-grand-hotel' }, create: { id: 'dylan-grand-hotel', ...data }, update: data });
      await tx.auditLog.create({ data: { actorId, operation: 'SET_WEEKEND_RATE', entity: 'HotelSettings', entityId: 'dylan-grand-hotel', detail: { ...dto } } });
      return dto;
    });
  }
  async setPolicy(code: string, dto: RatePolicyDto, actorId: string) {
    if (code !== 'FLEXIBLE' && code !== 'NON_REFUNDABLE') throw new BadRequestException('Unknown rate plan.');
    if (code === 'FLEXIBLE' && !dto.active) throw new BadRequestException('Flexible must remain active.');
    if (code === 'NON_REFUNDABLE' && (dto.freeCancellationHours != null || dto.lateFee !== 'FULL' || dto.noShowFee !== 'FULL')) throw new BadRequestException('Non-refundable requires full cancellation and no-show fees.');
    return this.pricingWrite(async tx => {
      const data = { ...dto, freeCancellationHours: dto.freeCancellationHours ?? null };
      const result = await tx.ratePlanPolicy.upsert({ where: { code }, create: { code, ...data }, update: data });
      await tx.auditLog.create({ data: { actorId, operation: 'SET_RATE_POLICY', entity: 'RatePlanPolicy', entityId: code, detail: data } });
      return result;
    });
  }
  async specialRates() {
    return this.db.specialRatePeriod.findMany({ orderBy: { startDate: 'asc' }, include: { dailyRates: { distinct: ['roomTypeId'], select: { roomType: { select: { code: true, nameEn: true, nameVi: true } } } } } });
  }
  async saveSpecial(dto: SpecialRateDto, actorId: string, id?: string) {
    const start = day(dto.startDate), end = day(dto.endDate);
    const count = (end.valueOf() - start.valueOf()) / 86400000 + 1;
    if (dto.startDate < hotelToday() || count < 1 || count > 366) throw new BadRequestException('Select 1–366 days from today onwards.');
    return this.pricingWrite(async tx => {
      const existing = id ? await tx.specialRatePeriod.findUnique({ where: { id } }) : null;
      if (id && !existing) throw new NotFoundException('Special rate not found.');
      if (existing && existing.startDate < day(hotelToday())) throw new ConflictException('Past special rates cannot be edited.');
      const types = await tx.roomType.findMany({ where: dto.roomTypeCode === '*' ? (id ? { dailyRates: { some: { periodId: id } } } : {}) : { code: dto.roomTypeCode }, select: { id: true } });
      if (!types.length) throw new NotFoundException('Room type not found.');
      const overlap = await tx.dailyRate.findFirst({ where: { roomTypeId: { in: types.map(t => t.id) }, date: { gte: start, lte: end }, ...(id ? { OR: [{ periodId: null }, { periodId: { not: id } }] } : {}) } });
      if (overlap) throw new ConflictException('Special rate overlaps an existing daily or period rate.');
      const data = { name: dto.name.trim(), startDate: start, endDate: end, amountVnd: dto.amountVnd };
      const period = id ? await tx.specialRatePeriod.update({ where: { id }, data }) : await tx.specialRatePeriod.create({ data });
      if (id) await tx.dailyRate.deleteMany({ where: { periodId: id } });
      await tx.dailyRate.createMany({ data: types.flatMap(t => Array.from({ length: count }, (_, i) => ({ roomTypeId: t.id, date: new Date(start.valueOf() + i * 86400000), amountVnd: dto.amountVnd, periodId: period.id }))) });
      await tx.auditLog.create({ data: { actorId, operation: id ? 'EDIT_SPECIAL_RATE' : 'CREATE_SPECIAL_RATE', entity: 'SpecialRatePeriod', entityId: period.id, detail: { ...dto } } });
      return period;
    });
  }
  async deleteSpecial(id: string, actorId: string) {
    return this.pricingWrite(async tx => {
      const period = await tx.specialRatePeriod.findUnique({ where: { id } });
      if (!period) throw new NotFoundException('Special rate not found.');
      if (period.startDate < day(hotelToday())) throw new ConflictException('Past special rates cannot be deleted.');
      await tx.dailyRate.deleteMany({ where: { periodId: id } });
      await tx.specialRatePeriod.delete({ where: { id } });
      await tx.auditLog.create({ data: { actorId, operation: 'DELETE_SPECIAL_RATE', entity: 'SpecialRatePeriod', entityId: id } });
      return { id };
    });
  }
  async deleteDaily(code: string, value: string, actorId: string) {
    const date = day(value);
    if (value < hotelToday()) throw new BadRequestException('Cannot delete past rates.');
    return this.pricingWrite(async tx => {
      const type = await tx.roomType.findUnique({ where: { code } });
      if (!type) throw new NotFoundException('Room type not found.');
      const rate = await tx.dailyRate.findUnique({ where: { roomTypeId_date: { roomTypeId: type.id, date } } });
      if (!rate || rate.periodId) throw new ConflictException('Only standalone daily rates can be deleted here.');
      await tx.dailyRate.delete({ where: { id: rate.id } });
      await tx.auditLog.create({ data: { actorId, operation: 'DELETE_DAILY_RATE', entity: 'DailyRate', entityId: rate.id } });
      return { id: rate.id };
    });
  }
  async pricing() {
    const [roomTypes, dailyRates, weekend, specialRates, plans] = await Promise.all([this.roomTypes(), this.db.dailyRate.findMany({ where: { periodId: null }, include: { roomType: { select: { code: true } } }, orderBy: { date: 'asc' } }), this.weekend(), this.specialRates(), this.ratePlans()]);
    return { roomTypes, dailyRates, weekend, specialRates, plans };
  }
  async rateCalendar(code: string, month: string) {
    if (typeof code !== 'string' || !code) throw new BadRequestException('Room type code required.');
    if (!/^\d{4}-\d{2}$/.test(month)) throw new BadRequestException('Month must be YYYY-MM.');
    const first = day(`${month}-01`);
    const end = new Date(first); end.setUTCMonth(end.getUTCMonth() + 1);
    const type = await this.roomType(code);
    const [weekend, daily, plans] = await Promise.all([this.weekend(), this.db.dailyRate.findMany({ where: { roomTypeId: type.id, date: { gte: first, lt: end } }, include: { period: { select: { name: true } } } }), this.ratePlans()]);
    const overrides = new Map(daily.map(r => [r.date.toISOString().slice(0, 10), r]));
    return Array.from({ length: (end.valueOf() - first.valueOf()) / 86400000 }, (_, i) => {
      const date = new Date(first.valueOf() + i * 86400000), key = date.toISOString().slice(0, 10), override = overrides.get(key);
      const resolved = resolveNight(date, type.baseRateVnd, weekend, override?.amountVnd);
      return { date: key, source: resolved.source, amountVnd: resolved.raw, baseRateVnd: type.baseRateVnd, weekendSurchargeVnd: weekend.enabled && [0, 6].includes(date.getUTCDay()) ? weekend.surchargeVnd : 0, specialRateVnd: override?.amountVnd ?? null, flexibleVnd: planAmount(resolved.raw, plans[0]), nonRefundableVnd: plans[1].active ? planAmount(resolved.raw, plans[1]) : null, name: override?.period?.name ?? null };
    });
  }
  // Room is held for the whole stay, rather than just decrementing separate daily counters.
  // This guarantees a continuous physical assignment and avoids fragmented inventory.
  async freeRooms(client: Db, roomTypeId: string, start: Date, end: Date, exceptBookingId?: string) {
    const now = new Date();
    return client.physicalRoom.findMany({
      where: {
        roomTypeId, sellable: true,
        blocks: { none: { startDate: { lt: end }, endDate: { gt: start } } },
        bookings: {
          none: {
            ...(exceptBookingId ? { id: { not: exceptBookingId } } : {}),
            OR: [{ checkIn: { lt: end }, checkOut: { gt: start }, OR: [{ status: { in: [...ACTIVE] } }, { status: 'PENDING', holdExpiresAt: { gt: now } }] }, { status: 'CHECKED_IN', checkOut: { lte: day(hotelToday()) } }],
          }
        },
      }, orderBy: { number: 'asc' },
    });
  }
  async availability(dto: SearchDatesDto & {
    adults: number;
    children?: number;
  }) {
    const dates = nights(dto.checkIn, dto.checkOut);
    const start = dates[0];
    const end = day(dto.checkOut);
    const types = await this.db.roomType.findMany({ where: { isPublished: true, maxGuests: { gte: dto.adults + (dto.children ?? 0) }, baseRateVnd: { gt: 0 } }, orderBy: { code: 'asc' } });
    const answer = [];
    for (const type of types) {
      const rooms = await this.freeRooms(this.db, type.id, start, end);
      const quote = await this.quote(this.db, type.id, dates, 'FLEXIBLE');
      answer.push({ roomTypeCode: type.code, roomTypeName: type.nameEn, availableRooms: rooms.length, totalRoomPriceVnd: quote.totalVnd, nights: dates.length });
    }
    return { checkIn: dto.checkIn, checkOut: dto.checkOut, roomTypes: answer };
  }
  async quote(client: Db, roomTypeId: string, dates: Date[], plan: PlanCode, snapshot?: Policy) {
    const type = await client.roomType.findUnique({ where: { id: roomTypeId } });
    if (!type?.baseRateVnd || !type.isPublished)
      throw new BadRequestException('Room type not published or priced.');
    const [daily, weekend, plans] = await Promise.all([client.dailyRate.findMany({ where: { roomTypeId, date: { in: dates } } }), this.weekend(client), this.ratePlans(client)]);
    const policy = snapshot ?? plans.find(p => p.code === plan) ?? defaultPolicy(plan);
    if (!snapshot && !policy.active) throw new BadRequestException('Rate plan unavailable.');
    const overrides = new Map(daily.map((item) => [item.date.toISOString().slice(0, 10), item.amountVnd]));
    const lines = dates.map((date) => {
      const { raw } = resolveNight(date, type.baseRateVnd, weekend, overrides.get(date.toISOString().slice(0, 10)));
      assertVnd(raw);
      return { date: date.toISOString().slice(0, 10), amountVnd: planAmount(raw, policy) };
    });
    const totalVnd = lines.reduce((sum, line) => sum + line.amountVnd, 0);
    assertVnd(totalVnd);
    return { lines, totalVnd, policy };
  }
  async maintenance(dto: CreateMaintenanceBlockDto, actorId: string) {
    const dates = nights(dto.startDate, dto.endDate, true);
    const start = dates[0];
    const end = day(dto.endDate);
    return this.db.$transaction(async (tx) => {
      const room = await tx.physicalRoom.findUnique({ where: { number: dto.roomNumber } });
      if (!room)
        throw new NotFoundException('Physical room not found.');
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${room.roomTypeId}))`;
      const count = await tx.booking.count({
        where: {
          roomId: room.id, OR: [{ checkIn: { lt: end }, checkOut: { gt: start }, OR: [{ status: { in: [...ACTIVE] } }, { status: 'PENDING', holdExpiresAt: { gt: new Date() } }] }, { status: 'CHECKED_IN', checkOut: { lte: day(hotelToday()) } }],
        }
      });
      if (count > 0)
        throw new ConflictException('Maintenance overlaps an active booking/hold.');
      const overlaps = await tx.maintenanceBlock.count({ where: { roomId: room.id, startDate: { lt: end }, endDate: { gt: start } } });
      if (overlaps > 0)
        throw new ConflictException('Maintenance block overlaps existing block.');
      const block = await tx.maintenanceBlock.create({ data: { roomId: room.id, startDate: start, endDate: end, reason: dto.reason } });
      await tx.auditLog.create({ data: { actorId, operation: 'CREATE_MAINTENANCE', entity: 'MaintenanceBlock', entityId: block.id, detail: { roomNumber: dto.roomNumber, startDate: dto.startDate, endDate: dto.endDate } } });
      return block;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
  async removeMaintenance(id: string, actorId: string) {
    const block = await this.db.maintenanceBlock.findUnique({ where: { id } });
    if (!block)
      throw new NotFoundException('Maintenance block not found.');
    await this.db.maintenanceBlock.delete({ where: { id } });
    await this.db.auditLog.create({ data: { actorId, operation: 'REMOVE_MAINTENANCE', entity: 'MaintenanceBlock', entityId: id } });
    return { id, removed: true };
  }
  async inventory(dto: SearchDatesDto) {
    nights(dto.checkIn, dto.checkOut, true);
    const [rooms, bookings, blocks] = await Promise.all([
      this.db.physicalRoom.findMany({ include: { roomType: { select: { code: true } } }, orderBy: { number: 'asc' } }),
      this.db.booking.findMany({ where: { OR: [{ checkIn: { lt: day(dto.checkOut) }, checkOut: { gt: day(dto.checkIn) }, OR: [{ status: { in: [...ACTIVE] } }, { status: 'PENDING', holdExpiresAt: { gt: new Date() } }] }, { status: 'CHECKED_IN', checkOut: { lte: day(hotelToday()) } }] }, select: { roomId: true, code: true, status: true, checkIn: true, checkOut: true } }),
      this.db.maintenanceBlock.findMany({ where: { startDate: { lt: day(dto.checkOut) }, endDate: { gt: day(dto.checkIn) } } }),
    ]);
    return { rooms, bookings, blocks };
  }
}
