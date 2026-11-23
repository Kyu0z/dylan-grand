import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HotelService } from '../../../core/hotel.service';
import { AvailabilityQueryDto } from './dto/availability-query.dto';

@ApiTags('Customer · Availability')
@Controller('availability')
export class CustomerAvailabilityController {
  constructor(private readonly hotel: HotelService) {}
  @Get() @ApiOperation({ summary: '[DB] Search continuously available rooms and quote flexible room rate', description: 'Check-out exclusive; respects active holds, confirmed stays and maintenance. Hotel-local dates.' })
  search(@Query() query: AvailabilityQueryDto) { return this.hotel.availability(query); }
}
