import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BookingService } from '../../../core/booking.service';
import { CancelBookingDto, CustomerBookingDto, LookupBookingDto, ReviewDto } from '../../../core/contracts';
import { FinanceService } from '../../../core/finance.service';
import { SessionUser } from '../../../common/auth/auth.guard';

@ApiTags('Customer · Bookings')
@Controller('bookings')
export class CustomerBookingsController {
  constructor(private readonly bookings: BookingService, private readonly finance: FinanceService) {}
  @Post() @ApiOperation({ summary: '[DB] Create confirmed pay-at-hotel booking or temporary hold', description: 'Atomic room assignment; lookup token returned ONLY once. Optional Bearer customer token links reservation to account.' })
  create(@Body() dto: CustomerBookingDto, @Req() req: { user?: SessionUser }) { return this.bookings.create(dto, req.user?.role === 'CUSTOMER' ? req.user.id : undefined); }
  @Get('lookup') @ApiOperation({ summary: '[DB] Look up a reservation using private token' })
  lookup(@Query() dto: LookupBookingDto) { return this.bookings.lookup(dto.code, dto.lookupToken); }
  @Post(':code/cancel') @ApiOperation({ summary: '[DB] Cancel booking with private lookup token; calculate cancellation fee' })
  cancel(@Param('code') code: string, @Body() dto: CancelBookingDto, @Req() req: { user?: SessionUser }) { return this.bookings.cancel(code, dto, undefined, req.user?.role === 'CUSTOMER' ? req.user.id : undefined); }
  @Post(':code/review') @ApiOperation({ summary: '[DB] Review a completed stay (private lookup token required)' })
  review(@Param('code') code: string, @Body() dto: ReviewDto) { return this.finance.review(code, dto); }
}
