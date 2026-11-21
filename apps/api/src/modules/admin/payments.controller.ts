import { Body, Controller, Get, Post, Param } from '@nestjs/common';
import { ApiBody, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiPlanned, pendingFeature } from '../../common/pending-feature';
import { RecordPaymentDto } from './dto/admin-contract.dto';

@ApiTags('Admin · Payments')
@Controller('admin/payments')
export class AdminPaymentsController {
  @Get()
  @ApiPlanned('List payments and refunds', 'Requires transaction history, reconciliation and authorization.')
  list(): never {
    return pendingFeature('List payments and refunds');
  }

  @Post('reservations/:bookingCode/manual-payment')
  @ApiParam({ name: 'bookingCode', example: 'DGH-001' })
  @ApiPlanned('Record an on-site payment', 'Requires idempotency and an audit record.')
  @ApiBody({ type: RecordPaymentDto })
  record(@Param('bookingCode') _bookingCode: string, @Body() _dto: RecordPaymentDto): never {
    return pendingFeature('Record an on-site payment');
  }
}
