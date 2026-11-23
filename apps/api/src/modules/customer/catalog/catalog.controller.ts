import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HotelService } from '../../../core/hotel.service';

@Controller()
export class CustomerCatalogController {
  constructor(private readonly hotel: HotelService) {}
  @Get('hotel') @ApiTags('Customer · Hotel') @ApiOperation({ summary: '[DB] Public property information' })
  getHotel() { return this.hotel.hotel(); }
  @Get('rooms') @ApiTags('Customer · Rooms') @ApiOperation({ summary: '[DB] Published room types with current base prices' })
  getRoomTypes() { return this.hotel.roomTypes(true); }
  @Get('rooms/:code') @ApiTags('Customer · Rooms') @ApiOperation({ summary: '[DB] Published room type detail' })
  getRoomType(@Param('code') code: string) { return this.hotel.roomType(code, true); }
}
