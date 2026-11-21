import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiPlanned, pendingFeature } from '../../../common/pending-feature';

@ApiTags('Customer · Account')
@Controller('me')
export class CustomerAccountController {
  @Get('bookings')
  @ApiPlanned('List my bookings', 'Requires login and server-side ownership checks. This route has no active authentication yet and returns 501.')
  bookings(): never {
    return pendingFeature('Customer-owned booking history');
  }
}
