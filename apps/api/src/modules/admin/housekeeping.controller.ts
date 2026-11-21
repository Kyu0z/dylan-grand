import { Body, Controller, Get, Patch, Param } from '@nestjs/common';
import { ApiBody, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiPlanned, pendingFeature } from '../../common/pending-feature';
import { UpdateHousekeepingDto } from './dto/admin-contract.dto';

@ApiTags('Admin · Housekeeping')
@Controller('admin/housekeeping')
export class AdminHousekeepingController {
  @Get()
  @ApiPlanned('List housekeeping tasks', 'Room cleaning state is distinct from occupancy and sellability.')
  list(): never {
    return pendingFeature('List housekeeping tasks');
  }

  @Patch('rooms/:roomNumber')
  @ApiParam({ name: 'roomNumber', example: '201' })
  @ApiPlanned('Update room cleaning status', 'Dirty/Clean/Inspected transitions must respect the configured workflow.')
  @ApiBody({ type: UpdateHousekeepingDto })
  update(@Param('roomNumber') _roomNumber: string, @Body() _dto: UpdateHousekeepingDto): never {
    return pendingFeature('Update room cleaning status');
  }
}
