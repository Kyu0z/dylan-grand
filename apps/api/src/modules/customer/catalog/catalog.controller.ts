import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { HotelPreviewDto, RoomTypePreviewDto } from './dto/catalog.dto';

// These values are copied from the most recent User Site concept data only.
// They are NOT the database source of truth, room inventory, or final selling rates.
const DEMO_ROOMS: RoomTypePreviewDto[] = [
  {
    code: 'deluxe', name: 'Deluxe Room', sizeSqm: 32, maxGuests: 2,
    beds: 'King bed', indicativePriceVnd: 2250000,
    amenities: ['Wi-Fi', 'Rain shower', 'Smart TV', 'Coffee & tea', 'Air conditioning', 'Workspace'],
    demo: true,
  },
  {
    code: 'premier', name: 'Premier Room', sizeSqm: 40, maxGuests: 3,
    beds: 'King or twin', indicativePriceVnd: 3150000,
    amenities: ['Wi-Fi', 'Bathtub', 'Smart TV', 'Minibar', 'Air conditioning', 'Lounge area'],
    demo: true,
  },
  {
    code: 'suite', name: 'Grand Suite', sizeSqm: 64, maxGuests: 3,
    beds: 'King bed', indicativePriceVnd: 4950000,
    amenities: ['Wi-Fi', 'Free-standing bath', 'Smart TV', 'Minibar', 'Private lounge', 'Coffee machine'],
    demo: true,
  },
];

@Controller()
export class CustomerCatalogController {
  @Get('hotel')
  @ApiTags('Customer · Hotel')
  @ApiOperation({ summary: '[DEMO] Read public hotel identity', description: 'Static branding metadata; no real CMS data or contact address.' })
  @ApiOkResponse({ type: HotelPreviewDto })
  getHotel(): HotelPreviewDto {
    return { code: 'dylan-grand-hotel', name: 'Dylan Grand Hotel', languages: ['en', 'vi'], demo: true };
  }

  @Get('rooms')
  @ApiTags('Customer · Rooms')
  @ApiOperation({ summary: '[DEMO] List room types', description: 'Presentation room types from current User Site; indicative prices only, no availability.' })
  @ApiOkResponse({ type: RoomTypePreviewDto, isArray: true })
  getRoomTypes(): RoomTypePreviewDto[] {
    return DEMO_ROOMS;
  }

  @Get('rooms/:code')
  @ApiTags('Customer · Rooms')
  @ApiOperation({ summary: '[DEMO] Room type detail', description: 'Does not query physical room availability or calculate a daily rate.' })
  @ApiParam({ name: 'code', example: 'deluxe', description: 'Concept room code: deluxe, premier, suite' })
  @ApiOkResponse({ type: RoomTypePreviewDto })
  getRoomType(@Param('code') code: string): RoomTypePreviewDto {
    const room = DEMO_ROOMS.find((item) => item.code === code);
    if (!room) throw new NotFoundException(`Room type '${code}' not found in the demo catalog.`);
    return room;
  }
}
