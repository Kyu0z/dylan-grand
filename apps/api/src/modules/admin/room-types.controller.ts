import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/auth/auth.guard';
import { HotelService } from '../../core/hotel.service';
import { PatchRoomTypeDto, SetRoomTypeDto } from '../../core/contracts';

@ApiBearerAuth('access-token')
@ApiTags('Admin · Room Types')
@Roles('ADMIN','MANAGER')
@Controller('admin/room-types')
export class AdminRoomTypesController {
  constructor(private readonly hotel: HotelService) {}
  @Get() @ApiOperation({ summary: '[DB] List all room types' }) list() { return this.hotel.roomTypes(); }
  @Get(':code') @ApiOperation({ summary: '[DB] Get room type' }) details(@Param('code') code: string) { return this.hotel.roomType(code); }
  @Post() @ApiOperation({ summary: '[DB] Create room type with a base price' }) create(@Body() dto: SetRoomTypeDto) { return this.hotel.createRoomType(dto); }
  @Patch(':code') @ApiOperation({ summary: '[DB] Publish, unpublish, or edit room type' })
  patch(@Param('code') code: string, @Body() dto: PatchRoomTypeDto, @Req() req: { user: { id: string } }) { return this.hotel.patchRoomType(code, dto, req.user.id); }
}
