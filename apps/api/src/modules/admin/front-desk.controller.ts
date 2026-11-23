import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/auth/auth.guard';
import { BookingService } from '../../core/booking.service';
import { AssignRoomDto, ExtendStayDto, LateArrivalDto, NoShowDto } from '../../core/contracts';

@ApiBearerAuth('access-token')
@ApiTags('Admin · Front Desk')
@Roles('ADMIN','MANAGER','RECEPTIONIST')
@Controller('admin/front-desk')
export class AdminFrontDeskController {
  constructor(private readonly bookings: BookingService) {}
  @Get() @ApiOperation({ summary: '[DB] Arrivals / In-house / Departures' }) list() { return this.bookings.frontDesk(); }
  @Post('reservations/:code/assign-room') @ApiOperation({ summary: '[DB] Assign or transfer room; check continuity and housekeeping' })
  assign(@Param('code') code: string, @Body() dto: AssignRoomDto, @Req() req: { user: { id: string } }) { return this.bookings.assignRoom(code, dto, req.user.id); }
  @Post('reservations/:code/check-in') @ApiOperation({ summary: '[DB] Check in confirmed reservation into inspected room' })
  checkIn(@Param('code') code: string, @Req() req: { user: { id: string } }) { return this.bookings.checkIn(code, req.user.id); }
  @Post('reservations/:code/check-out') @ApiOperation({ summary: '[DB] Check out once folio settled; make room Dirty' })
  checkOut(@Param('code') code: string, @Req() req: { user: { id: string } }) { return this.bookings.checkOut(code, req.user.id); }
  @Post('reservations/:code/no-show') @ApiOperation({ summary: '[DB] Mark no-show AFTER hotel-local arrival day; calculate fee' })
  noShow(@Param('code') code: string, @Body() dto: NoShowDto, @Req() req: { user: { id: string } }) { return this.bookings.noShow(code, dto, req.user.id); }
  @Post('reservations/:code/late-arrival') @ApiOperation({ summary: '[DB] Note late arrival to protect from premature no-show' })
  late(@Param('code') code: string, @Body() dto: LateArrivalDto, @Req() req: { user: { id: string } }) { return this.bookings.noteLateArrival(code, dto, req.user.id); }
  @Post('reservations/:code/extend') @ApiOperation({ summary: '[DB] Extend stay with room availability check and new nightly charges' })
  extend(@Param('code') code: string, @Body() dto: ExtendStayDto, @Req() req: { user: { id: string } }) { return this.bookings.extend(code, dto, req.user.id); }
}
