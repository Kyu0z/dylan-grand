import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { ApiPlanned, pendingFeature } from '../../common/pending-feature';
import { CreatePhysicalRoomDto } from './dto/admin-contract.dto';

@ApiTags('Admin · Physical Rooms')
@Controller('admin/physical-rooms')
export class AdminPhysicalRoomsController {
  @Get()
  @ApiPlanned('List physical rooms', 'Each room belongs to one room type; occupancy and cleaning status are separate.')
  list(): never {
    return pendingFeature('List physical rooms');
  }

  @Post()
  @ApiPlanned('Create physical room', 'Room number must be unique per hotel.')
  @ApiBody({ type: CreatePhysicalRoomDto })
  create(@Body() _dto: CreatePhysicalRoomDto): never {
    return pendingFeature('Create physical room');
  }
}
