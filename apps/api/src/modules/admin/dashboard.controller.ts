import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiPlanned, pendingFeature } from '../../common/pending-feature';

@ApiTags('Admin · Dashboard')
@Controller('admin/dashboard')
export class AdminDashboardController {
  @Get()
  @ApiPlanned('View operational overview', 'Occupancy, arrivals, departures and revenue need authoritative database queries.')
  overview(): never {
    return pendingFeature('View operational overview');
  }
}
