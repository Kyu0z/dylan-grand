import { Controller, Get, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/auth/auth.guard';
import { BookingService } from '../../../core/booking.service';

@ApiTags('Customer · Account')
@ApiBearerAuth('access-token')
@Roles('CUSTOMER')
@Controller('me')
export class CustomerAccountController {
  constructor(private readonly bookings: BookingService) {}
  @Get('bookings') @ApiOperation({ summary: '[DB] Bookings owned by signed-in customer' })
  list(@Req() req: { user: { id: string } }) { return this.bookings.customerList(req.user.id); }
}
