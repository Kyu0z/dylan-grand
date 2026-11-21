import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiPlanned, pendingFeature } from '../../../common/pending-feature';

@ApiTags('Customer · Payments')
@Controller('payments')
export class CustomerPaymentsController {
  @Get('methods')
  @ApiPlanned('List allowed payment options', 'Allowed methods and guarantee rules must be configured before live payment processing.')
  methods(): never {
    return pendingFeature('Customer payment methods');
  }
}
