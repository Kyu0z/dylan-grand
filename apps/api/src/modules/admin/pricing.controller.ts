import { Body, Controller, Get, Param, Put, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/auth/auth.guard';
import { SetDailyRateDto } from '../../core/contracts';
import { HotelService } from '../../core/hotel.service';
import { SetBaseRateDto } from './dto/admin-contract.dto';

@ApiBearerAuth('access-token')
@ApiTags('Admin · Pricing')
@Roles('ADMIN','MANAGER')
@Controller('admin/pricing')
export class AdminPricingController {
  constructor(private readonly hotel: HotelService) {}
  @Get() @ApiOperation({ summary: '[DB] Base rates, daily rate overrides and plan policies' }) rates() { return this.hotel.pricing(); }
  @Put('room-types/:code/base-rate') @ApiOperation({ summary: '[DB] Update future base price, not existing booking snapshots' })
  setBase(@Param('code') code: string, @Body() dto: SetBaseRateDto, @Req() req: { user: { id: string } }) { return this.hotel.setBaseRate(code, dto.amountVnd, req.user.id); }
  @Post('room-types/:code/daily-rates') @ApiOperation({ summary: '[DB] Set day-specific room price' })
  daily(@Param('code') code: string, @Body() dto: SetDailyRateDto, @Req() req: { user: { id: string } }) { return this.hotel.setDailyRate(code, dto, req.user.id); }
}
