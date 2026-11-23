import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/auth/auth.guard';
import { HotelService } from '../../core/hotel.service';
import { UpdateHotelDto } from './dto/admin-contract.dto';

@ApiBearerAuth('access-token')
@ApiTags('Admin · Hotel')
@Roles('ADMIN','MANAGER')
@Controller('admin/hotel')
export class AdminHotelController {
  constructor(private readonly hotel: HotelService) {}
  @Get() @ApiOperation({ summary: '[DB] Property settings' }) details() { return this.hotel.hotel(); }
  @Patch() @ApiOperation({ summary: '[DB] Update property name or contact email' })
  update(@Body() dto: UpdateHotelDto, @Req() req: { user: { id: string } }) { return this.hotel.updateHotel(dto, req.user.id); }
}
