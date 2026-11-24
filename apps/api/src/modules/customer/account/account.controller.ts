import { Body, Controller, Get, Header, Patch, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/auth/auth.guard';
import { AuthService } from '../../../core/auth.service';
import { IsString, Matches, MaxLength } from 'class-validator';
import { BookingService } from '../../../core/booking.service';

class UpdateProfileDto {
  @ApiProperty({ maxLength: 120 }) @IsString() @Matches(/\S/) @MaxLength(120) fullName!: string;
  @ApiProperty({ maxLength: 32 }) @IsString() @MaxLength(32) phone!: string;
}

@ApiTags('Customer · Account')
@ApiBearerAuth('access-token')
@Roles('CUSTOMER')
@Controller('me')
export class CustomerAccountController {
  constructor(private readonly bookings: BookingService, private readonly auth: AuthService) {}
  @Get() @Header('Cache-Control', 'no-store') @ApiOperation({ summary: '[DB] Signed-in customer profile' })
  profile(@Req() req: { user: { id: string } }) { return this.auth.customerProfile(req.user.id); }
  @Patch() @Header('Cache-Control', 'no-store') @ApiOperation({ summary: '[DB] Update customer name and phone' })
  update(@Req() req: { user: { id: string; email: string } }, @Body() dto: UpdateProfileDto) {
    return this.auth.updateCustomerProfile(req.user.id, req.user.email, dto.fullName, dto.phone);
  }
  @Get('bookings') @ApiOperation({ summary: '[DB] Bookings owned by signed-in customer' })
  list(@Req() req: { user: { id: string } }) { return this.bookings.customerList(req.user.id); }
}
