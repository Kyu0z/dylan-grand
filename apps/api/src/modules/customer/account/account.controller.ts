import { Body, Controller, Get, Header, Patch, Put, Param, Post, HttpCode, Req, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/auth/auth.guard';
import { GoogleLinkDto } from '../../shared/auth/dto/google-auth.dto';
import { AuthService } from '../../../core/auth.service';
import { IsString, Matches, MaxLength, IsOptional, IsBoolean } from 'class-validator';
import { PrismaService } from '../../../database/prisma.service';
import { BookingService } from '../../../core/booking.service';

class UpdateProfileDto {
  @ApiProperty({ maxLength: 120 }) @IsString() @Matches(/\S/) @MaxLength(120) fullName!: string;
  @ApiProperty({ maxLength: 1000, required: false }) @IsOptional() @IsString() @MaxLength(1000) preferences?: string;
  @ApiProperty({ maxLength: 32 }) @IsString() @MaxLength(32) phone!: string;
}

class WishlistDto { @ApiProperty() @IsBoolean() saved!: boolean; }

@ApiTags('Customer · Account')
@ApiBearerAuth('access-token')
@Roles('CUSTOMER')
@Controller('me')
export class CustomerAccountController {
  constructor(private readonly bookings: BookingService, private readonly auth: AuthService, private readonly db: PrismaService) { }
  @Get() @Header('Cache-Control', 'no-store') @ApiOperation({ summary: '[DB] Signed-in customer profile' })
  profile(@Req() req: { user: { id: string; }; }) { return this.auth.customerProfile(req.user.id); }
  @Patch() @Header('Cache-Control', 'no-store') @ApiOperation({ summary: '[DB] Update customer name and phone' })
  update(@Req() req: { user: { id: string; email: string; }; }, @Body() dto: UpdateProfileDto) {
    return this.auth.updateCustomerProfile(req.user.id, req.user.email, dto.fullName, dto.phone, dto.preferences);
  }
  @Post('google') @HttpCode(200) @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Link Google to a signed-in customer after password confirmation' })
  linkGoogle(@Req() req: { user: { id: string }; ip?: string; headers: { origin?: string } }, @Body() dto: GoogleLinkDto) {
    return this.auth.linkGoogle(req.user.id, dto.credential, dto.nonce, dto.password, req.headers.origin, req.ip ?? 'unknown');
  }
  @Get('wishlist') @Header('Cache-Control', 'no-store')
  async wishlist(@Req() req: { user: { id: string; }; }) { const guest = await this.db.guest.findUnique({ where: { accountId: req.user.id }, select: { favoriteRoomCodes: true } }); return { codes: guest?.favoriteRoomCodes ?? [] }; }
  @Put('wishlist/:code') @Header('Cache-Control', 'no-store')
  async saveWishlist(@Param('code') code: string, @Body() dto: WishlistDto, @Req() req: { user: { id: string; email: string; }; }) {
    return this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${`wishlist-${req.user.id}`}))`;
      if (dto.saved && !await tx.roomType.findFirst({ where: { code, isPublished: true } })) throw new NotFoundException('Room type not found.');
      const guest = await tx.guest.findUnique({ where: { accountId: req.user.id } });
      if (!guest) throw new NotFoundException('Account not found.');
      const codes = Array.from(new Set(dto.saved ? [...guest.favoriteRoomCodes, code] : guest.favoriteRoomCodes.filter(x => x !== code)));
      await tx.guest.update({ where: { id: guest.id }, data: { favoriteRoomCodes: codes } });
      return { codes };
    });
  }
  @Get('bookings') @ApiOperation({ summary: '[DB] Bookings owned by signed-in customer' })
  list(@Req() req: { user: { id: string; }; }) { return this.bookings.customerList(req.user.id); }
}
