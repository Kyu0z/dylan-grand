import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/auth/auth.guard';
import { FinanceService } from '../../core/finance.service';
import { FolioAdjustmentDto, ManualPaymentDto, ManualRefundDto } from '../../core/contracts';

@ApiBearerAuth('access-token')
@ApiTags('Admin · Payments')
@Roles('ADMIN','MANAGER','RECEPTIONIST')
@Controller('admin/payments')
export class AdminPaymentsController {
  constructor(private readonly finance: FinanceService) {}
  @Get() @ApiOperation({ summary: '[DB] Manual payment and refund ledger' }) list() { return this.finance.payments(); }
  @Get('reservations/:code/folio') @ApiOperation({ summary: '[DB] Invoice charges, payment totals, net balance' })
  folio(@Param('code') code: string) { return this.finance.folio(code); }
  @Post('reservations/:code/manual-payment') @ApiOperation({ summary: '[DB] Record actual cash/bank receipt (idempotent)', description: 'Never charges a card; bank reference required for transfers.' })
  record(@Param('code') code: string, @Body() dto: ManualPaymentDto, @Req() req: { user: { id: string } }) { return this.finance.recordPayment(code, dto, req.user.id); }
  @Post('reservations/:code/adjustments') @Roles('ADMIN','MANAGER')
  @ApiOperation({ summary: '[DB] Manager-approved folio debit/credit with audit trail' })
  adjust(@Param('code') code: string, @Body() dto: FolioAdjustmentDto, @Req() req: { user: { id: string } }) { return this.finance.adjustFolio(code, dto, req.user.id); }
  @Post('reservations/:code/manual-refund') @Roles('ADMIN','MANAGER')
  @ApiOperation({ summary: '[DB] Attest completed external refund (idempotent)', description: 'Operator MUST complete and independently verify money transfer before calling; no payment gateway.' })
  refund(@Param('code') code: string, @Body() dto: ManualRefundDto, @Req() req: { user: { id: string } }) { return this.finance.recordRefund(code, dto, req.user.id); }
}
