import { Controller, Get, Post, Param } from '@nestjs/common';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiPlanned, pendingFeature } from '../../common/pending-feature';

@ApiTags('Admin · Front Desk')
@Controller('admin/front-desk')
export class AdminFrontDeskController {
  @Get()
  @ApiPlanned('View arrival and departure queue', 'Dates are interpreted in hotel local timezone.')
  arrivals(): never {
    return pendingFeature('View arrival and departure queue');
  }

  @Post('reservations/:bookingCode/check-in')
  @ApiParam({ name: 'bookingCode', example: 'DGH-001' })
  @ApiPlanned('Check in a guest', 'Booking must be confirmed; room assignment must be valid and ready.')
  checkIn(@Param('bookingCode') _bookingCode: string): never {
    return pendingFeature('Check in a guest');
  }

  @Post('reservations/:bookingCode/check-out')
  @ApiParam({ name: 'bookingCode', example: 'DGH-001' })
  @ApiPlanned('Check out a guest', 'Settle folio and mark room for cleaning; payment and booking states stay separate.')
  checkOut(@Param('bookingCode') _bookingCode: string): never {
    return pendingFeature('Check out a guest');
  }
}
