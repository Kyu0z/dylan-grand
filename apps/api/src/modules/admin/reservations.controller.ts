import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/auth/auth.guard';
import { BookingService } from '../../core/booking.service';
import { CancelBookingDto, CustomerBookingDto } from '../../core/contracts';

@ApiBearerAuth('access-token')
@ApiTags('Admin · Reservations')
@Roles('ADMIN','MANAGER','RECEPTIONIST')
@Controller('admin/reservations')
export class AdminReservationsController {
  constructor(private readonly bookings: BookingService) {}
  @Get() @ApiOperation({ summary: '[DB] List all bookings' }) list(@Query('status') status?: string) { return this.bookings.list(status); }
  @Get(':code') @ApiOperation({ summary: '[DB] Booking detail by confirmation code' }) get(@Param('code') code: string) { return this.bookings.get(code); }
  @Post() @ApiOperation({ summary: '[DB] Walk-in/phone reservation using SAME booking transaction as Customer' })
  create(@Body() dto: CustomerBookingDto, @Req() req: { user: { id: string } }) { return this.bookings.create(dto, undefined, req.user.id); }
  @Post(':code/confirm') @ApiOperation({ summary: '[DB] Confirm unexpired 15-min hold after verifying guarantee' })
  confirm(@Param('code') code: string, @Req() req: { user: { id: string } }) { return this.bookings.confirm(code, req.user.id); }
  @Post(':code/cancel') @ApiOperation({ summary: '[DB] Cancel booking and calculate fee; refund remains separate' })
  cancel(@Param('code') code: string, @Body() dto: CancelBookingDto, @Req() req: { user: { id: string } }) { return this.bookings.cancel(code, dto, req.user.id); }
}
