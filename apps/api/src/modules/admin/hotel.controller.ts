import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { ApiPlanned, pendingFeature } from '../../common/pending-feature';
import { UpdateHotelDto } from './dto/admin-contract.dto';

@ApiTags('Admin · Hotel')
@Controller('admin/hotel')
export class AdminHotelController {
  @Get()
  @ApiPlanned('Read property configuration', 'Admin CMS and policy data are not stored yet.')
  details(): never {
    return pendingFeature('Read property configuration');
  }

  @Patch()
  @ApiPlanned('Update property information', 'Hotel changes need authorization, audits and persistence.')
  @ApiBody({ type: UpdateHotelDto })
  update(@Body() _dto: UpdateHotelDto): never {
    return pendingFeature('Update property information');
  }
}
