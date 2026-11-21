import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiPlanned, pendingFeature } from '../../common/pending-feature';

@ApiTags('Admin · Reports')
@Controller('admin/reports')
export class AdminReportsController {
  @Get()
  @ApiPlanned('View operation and revenue reports', 'Must distinguish booked revenue from collected payments.')
  summary(): never {
    return pendingFeature('View operation and revenue reports');
  }
}
