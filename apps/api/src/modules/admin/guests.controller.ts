import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiPlanned, pendingFeature } from '../../common/pending-feature';

@ApiTags('Admin · Guests & Reviews')
@Controller('admin/guests')
export class AdminGuestsController {
  @Get()
  @ApiPlanned('List guest profiles and reviews', 'Customer personal data must be restricted by role.')
  list(): never {
    return pendingFeature('List guest profiles and reviews');
  }
}
