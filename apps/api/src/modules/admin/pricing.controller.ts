import { Body, Controller, Get, Param, Put, Post, Req, Patch, Delete, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/auth/auth.guard';
import { SetDailyRateDto } from '../../core/contracts';
import { WeekendPricingDto, SpecialRateDto, RatePolicyDto } from '../../core/pricing.dto';
import { HotelService } from '../../core/hotel.service';
import { SetBaseRateDto } from './dto/admin-contract.dto';

@ApiBearerAuth('access-token')
@ApiTags('Admin · Pricing')
@Roles('ADMIN', 'MANAGER')
@Controller('admin/pricing')
export class AdminPricingController {
  constructor(private readonly hotel: HotelService) { }
  @Put('weekend') weekend(@Body() dto: WeekendPricingDto, @Req() req: { user: { id: string; }; }) { return this.hotel.setWeekend(dto, req.user.id); }
  @Get('special-rates') specialRates() { return this.hotel.specialRates(); }
  @Post('special-rates') createSpecial(@Body() dto: SpecialRateDto, @Req() req: { user: { id: string; }; }) { return this.hotel.saveSpecial(dto, req.user.id); }
  @Patch('special-rates/:id') editSpecial(@Param('id') id: string, @Body() dto: SpecialRateDto, @Req() req: { user: { id: string; }; }) { return this.hotel.saveSpecial(dto, req.user.id, id); }
  @Delete('special-rates/:id') deleteSpecial(@Param('id') id: string, @Req() req: { user: { id: string; }; }) { return this.hotel.deleteSpecial(id, req.user.id); }
  @Delete('room-types/:code/daily-rates/:date') deleteDaily(@Param('code') code: string, @Param('date') date: string, @Req() req: { user: { id: string; }; }) { return this.hotel.deleteDaily(code, date, req.user.id); }
  @Get('rate-plans') plans() { return this.hotel.ratePlans(); }
  @Patch('rate-plans/:code') policy(@Param('code') code: string, @Body() dto: RatePolicyDto, @Req() req: { user: { id: string; }; }) { return this.hotel.setPolicy(code, dto, req.user.id); }
  @Get('calendar') calendar(@Query('roomTypeCode') code: string, @Query('month') month: string) { return this.hotel.rateCalendar(code, month); }
  @Get() @ApiOperation({ summary: '[DB] Base rates, daily rate overrides and plan policies' }) rates() { return this.hotel.pricing(); }
  @Put('room-types/:code/base-rate') @ApiOperation({ summary: '[DB] Update future base price, not existing booking snapshots' })
  setBase(@Param('code') code: string, @Body() dto: SetBaseRateDto, @Req() req: { user: { id: string; }; }) { return this.hotel.setBaseRate(code, dto.amountVnd, req.user.id); }
  @Post('room-types/:code/daily-rates') @ApiOperation({ summary: '[DB] Set day-specific room price' })
  daily(@Param('code') code: string, @Body() dto: SetDailyRateDto, @Req() req: { user: { id: string; }; }) { return this.hotel.setDailyRate(code, dto, req.user.id); }
}
