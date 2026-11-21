import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { ApiPlanned, pendingFeature } from '../../common/pending-feature';
import { CreateMaintenanceBlockDto } from './dto/admin-contract.dto';

@ApiTags('Admin · Inventory')
@Controller('admin/inventory')
export class AdminInventoryController {
  @Get()
  @ApiPlanned('View inventory calendar', 'Availability must be computed by local date from physical rooms, bookings, holds and maintenance.')
  calendar(): never {
    return pendingFeature('View inventory calendar');
  }

  @Post('blocks')
  @ApiPlanned('Block room for a date range', 'Block must reject conflicting active assignments and update sellable inventory.')
  @ApiBody({ type: CreateMaintenanceBlockDto })
  block(@Body() _dto: CreateMaintenanceBlockDto): never {
    return pendingFeature('Block room for a date range');
  }
}
