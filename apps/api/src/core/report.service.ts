import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ReportQueryDto } from './contracts';
import { day, hotelToday } from './util';

@Injectable()
export class ReportService {
  constructor(private readonly db: PrismaService) { }

  async dashboard() {
    const today = hotelToday();
    const [rooms, reservations, arrivals, departures, dirty] = await Promise.all([
      this.db.physicalRoom.count({ where: { sellable: true } }),
      this.db.booking.count(),
      this.db.booking.count({ where: { checkIn: day(today), status: 'CONFIRMED' } }),
      this.db.booking.count({ where: { checkOut: day(today), status: 'CHECKED_IN' } }),
      this.db.physicalRoom.count({ where: { cleaningStatus: 'DIRTY' } }),
    ]);
    return { date: today, sellableRooms: rooms, totalBookings: reservations, arrivals, departures, dirtyRooms: dirty };
  }

  async report(query: ReportQueryDto) {
    const from = query.from ?? `${hotelToday().slice(0, 7)}-01`;
    const defaultTo = new Date(Date.UTC(Number(from.slice(0, 4)), Number(from.slice(5, 7)), 1)).toISOString().slice(0, 10);
    const to = query.to ?? defaultTo;
    const start = day(from).valueOf();
    const days = (day(to).valueOf() - start) / 86_400_000;
    if (!Number.isInteger(days) || days < 1 || days > 366) throw new BadRequestException('Report period must span 1–366 days.');
    const dates = Array.from({ length: days }, (_, i) => new Date(start + i * 86_400_000));
    const [rooms, bookings, blocks, payments] = await Promise.all([
      this.db.physicalRoom.findMany({ where: { sellable: true } }),
      this.db.booking.findMany({ where: { checkIn: { lt: day(to) }, checkOut: { gt: day(from) } }, include: { roomType: { select: { code: true } } } }),
      this.db.maintenanceBlock.findMany({ where: { startDate: { lt: day(to) }, endDate: { gt: day(from) } } }),
      this.db.paymentTransaction.findMany({ where: { createdAt: { gte: new Date(day(from).valueOf() - 7 * 3600_000), lt: new Date(day(to).valueOf() - 7 * 3600_000) } } }),
    ]);
    let availableRoomNights = 0;
    for (const date of dates) {
      availableRoomNights += rooms.filter((room) => !blocks.some((block) => block.roomId === room.id && block.startDate <= date && date < block.endDate)).length;
    }
    let soldNights = 0;
    let roomRevenueVnd = 0;
    for (const booking of bookings) {
      if (!['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'].includes(booking.status)) continue;
      for (const line of (booking.rateSnapshot as { date: string; amountVnd: number; }[])) {
        if (line.date >= from && line.date < to) {
          soldNights++;
          roomRevenueVnd += line.amountVnd;
        }
      }
    }
    const collectedVnd = payments.reduce((sum, p) => sum + (p.kind === 'PAYMENT' ? p.amountVnd : -p.amountVnd), 0);
    return {
      from, to, availableRoomNights, soldNights, roomRevenueVnd, cashCollectedVnd: collectedVnd,
      occupancyPercent: availableRoomNights ? Math.round(soldNights / availableRoomNights * 10000) / 100 : 0,
      adrVnd: soldNights ? Math.round(roomRevenueVnd / soldNights) : 0,
      revparVnd: availableRoomNights ? Math.round(roomRevenueVnd / availableRoomNights) : 0,
      definition: 'Booked room-nights and gross booked room revenue before promotion discounts for selected stay dates, not recognized accounting revenue. Cash is net successful manually recorded payments less refunds by transaction date.',
    };
  }
}
