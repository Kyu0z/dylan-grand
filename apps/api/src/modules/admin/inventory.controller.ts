import { Body, Controller, Delete, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/auth/auth.guard';
import { SearchDatesDto } from '../../core/contracts';
import { HotelService } from '../../core/hotel.service';
import { CreateMaintenanceBlockDto } from './dto/admin-contract.dto';

@ApiBearerAuth('access-token')
@ApiTags('Admin · Inventory')
@Controller('admin/inventory')
export class AdminInventoryController {
  constructor(private readonly hotel: HotelService) {}
  @Get() @ApiOperation({ summary: '[DB] Inventory reservations and maintenance for date range' })
  calendar(@Query() dto: SearchDatesDto) { return this.hotel.inventory(dto); }
  @Delete('blocks/:id') @Roles('ADMIN','MANAGER') @ApiOperation({ summary: '[DB] Remove maintenance block' })
  remove(@Param('id') id: string, @Req() req: { user: { id: string } }) { return this.hotel.removeMaintenance(id, req.user.id); }
  @Post('blocks') @Roles('ADMIN','MANAGER')
  @ApiOperation({ summary: '[DB] Block physical room for maintenance; rejects overlapping bookings' })
  block(@Body() dto: CreateMaintenanceBlockDto, @Req() req: { user: { id: string } }) { return this.hotel.maintenance(dto, req.user.id); }
}
