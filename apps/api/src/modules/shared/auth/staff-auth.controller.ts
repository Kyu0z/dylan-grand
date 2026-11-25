import { Body, Controller, Get, Header, HttpCode, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, IsNotEmpty } from 'class-validator';
import { AuthService } from '../../../core/auth.service';
import { RequiresAuth, Roles, type SessionUser } from '../../../common/auth/auth.guard';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';
import { LoginDto } from './dto/login.dto';
class TokenDto {
  @ApiProperty({ writeOnly: true }) @IsString() @MinLength(20) @MaxLength(1024) token!: string;
}
class ChangePasswordDto {
  @ApiProperty({ writeOnly: true }) @IsString() @IsNotEmpty() @MaxLength(128) currentPassword!: string;
  @ApiProperty({ writeOnly: true }) @IsString() @MinLength(12) @MaxLength(128) password!: string;
}
const staffRoles = ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPING'];
@ApiTags('Admin · Authentication')
@Controller('auth/staff')
export class StaffAuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('login') @Header('Cache-Control', 'no-store') @HttpCode(200) login(@Body() dto: LoginDto, @Req() req: { ip?: string }) { return this.auth.staffLogin(dto.email, dto.password, req.ip ?? 'unknown'); }
  @Post('forgot-password') @HttpCode(200) forgot(@Body() dto: ForgotPasswordDto, @Req() req: { ip?: string }) { return this.auth.staffForgotPassword(dto.email, req.ip ?? 'unknown', dto.locale); }
  @Post('reset-password/verify') @Header('Cache-Control', 'no-store') @HttpCode(200) verifyReset(@Body() dto: TokenDto, @Req() req: { ip?: string }) { return this.auth.inspectStaffToken(dto.token, false, req.ip ?? 'unknown'); }
  @Post('reset-password') @HttpCode(200) reset(@Body() dto: ResetPasswordDto, @Req() req: { ip?: string }) { return this.auth.completeStaffPassword(dto.token, dto.password, req.ip ?? 'unknown'); }
  @Post('activate-account/verify') @Header('Cache-Control', 'no-store') @HttpCode(200) verifyInvite(@Body() dto: TokenDto, @Req() req: { ip?: string }) { return this.auth.inspectStaffToken(dto.token, true, req.ip ?? 'unknown'); }
  @Post('activate-account') @HttpCode(200) activate(@Body() dto: ResetPasswordDto, @Req() req: { ip?: string }) { return this.auth.completeStaffPassword(dto.token, dto.password, req.ip ?? 'unknown', true); }
  @Get('me') @Header('Cache-Control', 'no-store') @RequiresAuth() @Roles(...staffRoles) @ApiBearerAuth('access-token') me(@Req() req: { user: SessionUser }) { return this.auth.staffProfile(req.user.id); }
  @Post('change-password') @HttpCode(200) @RequiresAuth() @Roles(...staffRoles) @ApiBearerAuth('access-token') change(@Body() dto: ChangePasswordDto, @Req() req: { user: SessionUser }) { return this.auth.changeStaffPassword(req.user.id, dto.currentPassword, dto.password); }
  @Post('logout') @HttpCode(200) @RequiresAuth() @Roles(...staffRoles) @ApiBearerAuth('access-token') logout(@Req() req: { user: SessionUser }) { return this.auth.logoutStaff(req.user.id); }
}
