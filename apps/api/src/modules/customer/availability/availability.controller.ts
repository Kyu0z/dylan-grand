import { Controller, Get, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiPlanned, pendingFeature } from '../../../common/pending-feature';
import { AvailabilityQueryDto } from './dto/availability-query.dto';

@ApiTags('Customer · Availability')
@Controller('availability')
export class CustomerAvailabilityController {
  @Get()
  @ApiPlanned(
    'Search available room types',
    'Real availability must be calculated per night from sellable physical rooms, reservations, active holds and maintenance. This endpoint deliberately returns 501 until that logic is implemented transactionally.',
  )
  @ApiQuery({ name: 'checkIn', example: '2026-12-04', description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'checkOut', example: '2026-12-07', description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'adults', example: 2, type: Number })
  @ApiQuery({ name: 'children', example: 0, type: Number, required: false })
  search(@Query() _query: AvailabilityQueryDto): never {
    return pendingFeature('Night-by-night availability');
  }
}
