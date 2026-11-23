import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/auth/auth.guard';
import { HotelService } from '../../core/hotel.service';
import { PatchPhysicalRoomDto } from '../../core/contracts';
import { CreatePhysicalRoomDto } from './dto/admin-contract.dto';

@ApiBearerAuth('access-token')
@ApiTags('Admin · Physical Rooms')
@Roles('ADMIN','MANAGER')
@Controller('admin/physical-rooms')
export class AdminPhysicalRoomsController {
  constructor(private readonly hotel: HotelService) {}
  @Get() @ApiOperation({ summary: '[DB] List physical rooms' }) list() { return this.hotel.physicalRooms(); }
  @Get(':number') @ApiOperation({ summary: '[DB] Get physical room' }) details(@Param('number') number: string) { return this.hotel.physicalRoom(number); }
  @Post() @ApiOperation({ summary: '[DB] Create physical room under an existing room type' }) create(@Body() dto: CreatePhysicalRoomDto) { return this.hotel.createPhysicalRoom(dto); }
  @Patch(':number') @ApiOperation({ summary: '[DB] Toggle whether physical room is sellable' })
  update(@Param('number') number: string, @Body() dto: PatchPhysicalRoomDto) { return this.hotel.patchPhysicalRoom(number, dto); }
}
