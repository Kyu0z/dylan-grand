import { Body, Controller, Get, Put, Param } from '@nestjs/common';
import { ApiBody, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiPlanned, pendingFeature } from '../../common/pending-feature';
import { SetBaseRateDto } from './dto/admin-contract.dto';

@ApiTags('Admin · Pricing')
@Controller('admin/pricing')
export class AdminPricingController {
  @Get()
  @ApiPlanned('View rates and rate plans', 'Daily rates, rate restrictions and quote snapshots are not implemented.')
  rates(): never {
    return pendingFeature('View rates and rate plans');
  }

  @Put('room-types/:code/base-rate')
  @ApiParam({ name: 'code', example: 'deluxe' })
  @ApiPlanned('Set a room-type base rate', 'Changes must not rewrite prices on existing confirmed bookings.')
  @ApiBody({ type: SetBaseRateDto })
  upsertRate(@Param('code') _code: string, @Body() _dto: SetBaseRateDto): never {
    return pendingFeature('Set a room-type base rate');
  }
}
