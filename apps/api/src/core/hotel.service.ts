import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { SearchDatesDto, SetDailyRateDto, SetRoomTypeDto, PatchRoomTypeDto, PatchPhysicalRoomDto } from './contracts';
import { day, hotelToday, isUnique, nights } from './util';
import { CreateMaintenanceBlockDto, CreatePhysicalRoomDto, UpdateHotelDto, UpdateHousekeepingDto } from '../modules/admin/dto/admin-contract.dto';

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
    if (!value || (publicOnly && !value.isPublished)) throw new NotFoundException('Room type not found.');
    return value;
  }
  async createRoomType(dto: SetRoomTypeDto) {
    if (dto.isPublished && dto.baseRateVnd < 1) throw new BadRequestException('Positive base rate required to publish.');
    try { return await this.db.roomType.create({ data: dto }); }
    catch (error) { if (isUnique(error)) throw new ConflictException('Room type code already exists.'); throw error; }
  }
  async patchRoomType(code: string, dto: PatchRoomTypeDto, actorId: string) {
    const previous = await this.roomType(code);
    if (dto.isPublished && previous.baseRateVnd <= 0) throw new BadRequestException('Set a positive base rate before publishing.');
    const updated = await this.db.roomType.update({ where: { code }, data: dto });
    await this.db.auditLog.create({ data: { actorId, operation: 'UPDATE_ROOM_TYPE', entity: 'RoomType', entityId: updated.id, detail: { code, isPublished: updated.isPublished } } });
    return updated;
  }
  async physicalRooms() {
    return this.db.physicalRoom.findMany({ orderBy: { number: 'asc' }, include: { roomType: { select: { code: true, nameEn: true, nameVi: true } } } });
  }
  async physicalRoom(number: string) {
    const value = await this.db.physicalRoom.findUnique({ where: { number }, include: { roomType: { select: { code: true, nameEn: true, nameVi: true } } } });
    if (!value) throw new NotFoundException('Physical room not found.');
    return value;
  }
  async createPhysicalRoom(dto: CreatePhysicalRoomDto) {
    const type = await this.db.roomType.findUnique({ where: { code: dto.roomTypeCode } });
    if (!type) throw new NotFoundException('Room type not found.');
    try { return await this.db.physicalRoom.create({ data: { number: dto.number, floor: dto.floor, roomTypeId: type.id } }); }
    catch (error) { if (isUnique(error)) throw new ConflictException('Physical room number already exists.'); throw error; }
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
        if (existing > 0) throw new ConflictException('Room has upcoming/active reservations; relocate them first.');
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
    if (!valid) throw new ConflictException(`Invalid housekeeping transition ${old} → ${dto.status}.`);
    return this.db.$transaction(async tx => {
      const changed = await tx.physicalRoom.updateMany({ where: { number, cleaningStatus: old }, data: { cleaningStatus: dto.status } });
      if (!changed.count) throw new ConflictException('Data changed concurrently. Please try again.');
      await tx.auditLog.create({ data: { actorId, operation: 'HOUSEKEEPING_STATUS', entity: 'PhysicalRoom', entityId: room.id, detail: { from: old, to: dto.status } } });
      return tx.physicalRoom.findUniqueOrThrow({ where: { number } });
    });
  }
  housekeeping() { return this.db.physicalRoom.findMany({ select: { number: true, floor: true, cleaningStatus: true, sellable: true }, orderBy: { number: 'asc' } }); }

  async setBaseRate(code: string, amountVnd: number, actorId: string) {
    await this.roomType(code);
    if (amountVnd < 1) throw new BadRequestException('Base rate must be positive.');
    const updated = await this.db.roomType.update({ where: { code }, data: { baseRateVnd: amountVnd } });
    await this.db.auditLog.create({ data: { actorId, operation: 'SET_BASE_RATE', entity: 'RoomType', entityId: updated.id, detail: { code, amountVnd } } });
    return updated;
  }
  async setDailyRate(code: string, dto: SetDailyRateDto, actorId: string) {
    const type = await this.roomType(code);
    day(dto.date);
    if (dto.amountVnd < 1) throw new BadRequestException('Daily rate must be positive.');
    const updated = await this.db.dailyRate.upsert({
      where: { roomTypeId_date: { roomTypeId: type.id, date: day(dto.date) } },
      create: { roomTypeId: type.id, date: day(dto.date), amountVnd: dto.amountVnd },
      update: { amountVnd: dto.amountVnd },
    });
    await this.db.auditLog.create({ data: { actorId, operation: 'SET_DAILY_RATE', entity: 'DailyRate', entityId: updated.id, detail: { code, date: dto.date, amountVnd: dto.amountVnd } } });
    return updated;
  }
  async pricing() {
    const [roomTypes, dailyRates] = await Promise.all([this.roomTypes(), this.db.dailyRate.findMany({ include: { roomType: { select: { code: true } } }, orderBy: { date: 'asc' } })]);
    return { plans: [{ code: 'FLEXIBLE', cancellation: 'Free until 48h before hotel-local check-in; otherwise one night' }, { code: 'NON_REFUNDABLE', cancellation: 'Full booking charge' }], roomTypes, dailyRates };
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

  async availability(dto: SearchDatesDto & { adults: number; children?: number; }) {
    const dates = nights(dto.checkIn, dto.checkOut);
    const start = dates[0]; const end = day(dto.checkOut);
    const types = await this.db.roomType.findMany({ where: { isPublished: true, maxGuests: { gte: dto.adults + (dto.children ?? 0) }, baseRateVnd: { gt: 0 } }, orderBy: { code: 'asc' } });
    const answer = [];
    for (const type of types) {
      const rooms = await this.freeRooms(this.db, type.id, start, end);
      const quote = await this.quote(this.db, type.id, dates, 'FLEXIBLE');
      answer.push({ roomTypeCode: type.code, roomTypeName: type.nameEn, availableRooms: rooms.length, totalRoomPriceVnd: quote.totalVnd, nights: dates.length });
    }
    return { checkIn: dto.checkIn, checkOut: dto.checkOut, roomTypes: answer };
  }

  async quote(client: Db, roomTypeId: string, dates: Date[], plan: 'FLEXIBLE' | 'NON_REFUNDABLE') {
    const type = await client.roomType.findUnique({ where: { id: roomTypeId } });
    if (!type?.baseRateVnd || !type.isPublished) throw new BadRequestException('Room type not published or priced.');
    const daily = await client.dailyRate.findMany({ where: { roomTypeId, date: { in: dates } } });
    const overrides = new Map(daily.map((item) => [item.date.toISOString().slice(0, 10), item.amountVnd]));
    const lines = dates.map((date) => {
      const raw = overrides.get(date.toISOString().slice(0, 10)) ?? type.baseRateVnd;
      return { date: date.toISOString().slice(0, 10), amountVnd: plan === 'NON_REFUNDABLE' ? Math.round(raw * 0.9) : raw };
    });
    return { lines, totalVnd: lines.reduce((sum, line) => sum + line.amountVnd, 0) };
  }

  async maintenance(dto: CreateMaintenanceBlockDto, actorId: string) {
    const dates = nights(dto.startDate, dto.endDate, true);
    const start = dates[0]; const end = day(dto.endDate);
    return this.db.$transaction(async (tx) => {
      const room = await tx.physicalRoom.findUnique({ where: { number: dto.roomNumber } });
      if (!room) throw new NotFoundException('Physical room not found.');
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${room.roomTypeId}))`;
      const count = await tx.booking.count({
        where: {
          roomId: room.id, OR: [{ checkIn: { lt: end }, checkOut: { gt: start }, OR: [{ status: { in: [...ACTIVE] } }, { status: 'PENDING', holdExpiresAt: { gt: new Date() } }] }, { status: 'CHECKED_IN', checkOut: { lte: day(hotelToday()) } }],
        }
      });
      if (count > 0) throw new ConflictException('Maintenance overlaps an active booking/hold.');
      const overlaps = await tx.maintenanceBlock.count({ where: { roomId: room.id, startDate: { lt: end }, endDate: { gt: start } } });
      if (overlaps > 0) throw new ConflictException('Maintenance block overlaps existing block.');
      const block = await tx.maintenanceBlock.create({ data: { roomId: room.id, startDate: start, endDate: end, reason: dto.reason } });
      await tx.auditLog.create({ data: { actorId, operation: 'CREATE_MAINTENANCE', entity: 'MaintenanceBlock', entityId: block.id, detail: { roomNumber: dto.roomNumber, startDate: dto.startDate, endDate: dto.endDate } } });
      return block;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async removeMaintenance(id: string, actorId: string) {
    const block = await this.db.maintenanceBlock.findUnique({ where: { id } });
    if (!block) throw new NotFoundException('Maintenance block not found.');
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
