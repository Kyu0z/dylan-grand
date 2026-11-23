import { Body, Controller, Get, Param, Patch, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/auth/auth.guard';
import { FinanceService } from '../../core/finance.service';
import { ReviewResponseDto } from '../../core/contracts';

@ApiBearerAuth('access-token')
@ApiTags('Admin · Guests & Reviews')
@Roles('ADMIN','MANAGER','RECEPTIONIST')
@Controller('admin/guests')
export class AdminGuestsController {
  constructor(private readonly finance: FinanceService) {}
  @Get() @ApiOperation({ summary: '[DB] Guest directory and completed stay counts' }) list() { return this.finance.guests(); }
  @Get('reviews') @ApiOperation({ summary: '[DB] Reviews from verified completed bookings' }) reviews() { return this.finance.reviews(); }
  @Patch('reviews/:id') @Roles('ADMIN','MANAGER') @ApiOperation({ summary: '[DB] Moderate/respond to review' })
  respond(@Param('id') id: string, @Body() dto: ReviewResponseDto, @Req() req: { user: { id: string } }) { return this.finance.reviewResponse(id, dto, req.user.id); }
}
