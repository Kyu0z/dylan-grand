import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { ApiPlanned, pendingFeature } from '../../common/pending-feature';
import { CreateRoomTypeDto } from './dto/admin-contract.dto';

@ApiTags('Admin · Room Types')
@Controller('admin/room-types')
export class AdminRoomTypesController {
  @Get()
  @ApiPlanned('List managed room types', 'Physical rooms and rate plans will be linked to room categories.')
  list(): never {
    return pendingFeature('List managed room types');
  }

  @Post()
  @ApiPlanned('Create room type', 'New room categories require validation and a durable database record.')
  @ApiBody({ type: CreateRoomTypeDto })
  create(@Body() _dto: CreateRoomTypeDto): never {
    return pendingFeature('Create room type');
  }
}
