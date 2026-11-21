import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { ApiPlanned, pendingFeature } from '../../common/pending-feature';
import { CreateBookingDto } from '../customer/bookings/dto/create-booking.dto';

@ApiTags('Admin · Reservations')
@Controller('admin/reservations')
export class AdminReservationsController {
  @Get()
  @ApiPlanned('List reservations', 'Must be permission-gated and support operational filtering.')
  list(): never {
    return pendingFeature('List reservations');
  }

  @Post()
  @ApiPlanned('Create reservation at front desk', 'Must use the same availability, pricing and atomic hold logic as the customer booking flow.')
  @ApiBody({ type: CreateBookingDto })
  create(@Body() _dto: CreateBookingDto): never {
    return pendingFeature('Create reservation at front desk');
  }
}
