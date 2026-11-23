import { Body, Controller, Get, Param, Patch, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HotelService } from '../../core/hotel.service';
import { UpdateHousekeepingDto } from './dto/admin-contract.dto';

@ApiBearerAuth('access-token')
@ApiTags('Admin · Housekeeping')
@Controller('admin/housekeeping')
export class AdminHousekeepingController {
  constructor(private readonly hotel: HotelService) {}
  @Get() @ApiOperation({ summary: '[DB] Housekeeping board' }) list() { return this.hotel.housekeeping(); }
  @Patch('rooms/:number') @ApiOperation({ summary: '[DB] DIRTY → CLEAN → INSPECTED; valid transitions only' })
  update(@Param('number') number: string, @Body() dto: UpdateHousekeepingDto, @Req() req: { user: { id: string } }) { return this.hotel.updateCleaning(number, dto, req.user.id); }
}
