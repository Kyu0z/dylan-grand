import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Customer · Payments')
@Controller('payments')
export class CustomerPaymentsController {
  @Get('methods')
  @ApiOperation({ summary: '[LIVE POLICY] Available payment methods', description: 'No online payment gateway integrated. Manual payments are performed by staff on the Admin API.' })
  methods() { return { methods: ['PAY_AT_HOTEL'], onlineGatewayEnabled: false, cardPaymentsEnabled: false, statement: 'This API does not charge credit cards.' }; }
}
