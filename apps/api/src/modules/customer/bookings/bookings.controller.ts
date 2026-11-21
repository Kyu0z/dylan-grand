import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { ApiPlanned, pendingFeature } from '../../../common/pending-feature';
import { CreateBookingDto } from './dto/create-booking.dto';

@ApiTags('Customer · Bookings')
@Controller('bookings')
export class CustomerBookingsController {
  @Post()
  @ApiPlanned(
    'Create guest booking',
    'Booking must validate availability and pricing, acquire an atomic hold, and apply the approved guarantee/payment rules. No fake confirmation is returned.',
  )
  @ApiBody({ type: CreateBookingDto })
  create(@Body() _dto: CreateBookingDto): never {
    return pendingFeature('Booking creation');
  }

  @Get('lookup')
  @ApiPlanned('Look up a booking', 'Requires an ownership verification flow for guest bookings; must not leak records by code alone.')
  lookup(): never {
    return pendingFeature('Booking lookup');
  }
}
