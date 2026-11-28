import { Body, Controller, Header, HttpCode, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from '../../../core/auth.service';
import { RegisterDto, SetupAdminDto } from '../../../core/contracts';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';
import { GoogleLoginDto } from './dto/google-auth.dto';
import { LoginDto } from './dto/login.dto';

@ApiTags('Shared · Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) { }
  @Post('setup-admin')
  @ApiOperation({ summary: '[DB] One-time admin bootstrap (development only)', description: 'Requires BOOTSTRAP_KEY and no existing admin. Disabled in production.' })
  setup(@Body() dto: SetupAdminDto) { return this.auth.setup(dto); }
  @Post('register')
  @ApiOperation({ summary: '[DB] Register customer account' })
  register(@Body() dto: RegisterDto) { return this.auth.register(dto); }
  @Post('forgot-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Request customer password reset by email', description: 'Generic response for known and unknown emails. Requires email delivery configuration.' })
  forgot(@Body() dto: ForgotPasswordDto, @Req() req: { ip?: string }) {
    return this.auth.forgotPassword(dto.email, req.ip ?? 'unknown', dto.locale);
  }
  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reset customer password using the emailed single-use token' })
  reset(@Body() dto: ResetPasswordDto, @Req() req: { ip?: string }) {
    return this.auth.resetPassword(dto.token, dto.password, req.ip ?? 'unknown');
  }
  @Post('google/challenge')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Issue a single-use Google sign-in nonce' })
  googleChallenge(@Req() req: { ip?: string; headers: { origin?: string } }) {
    return this.auth.googleChallenge(req.headers.origin, req.ip ?? 'unknown');
  }
  @Post('google')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Authenticate a customer using a verified Google ID token' })
  googleLogin(@Body() dto: GoogleLoginDto, @Req() req: { ip?: string; headers: { origin?: string } }) {
    return this.auth.googleLogin(dto.credential, dto.nonce, req.headers.origin, req.ip ?? 'unknown');
  }
  @Post('login')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '[DB] Login; copy accessToken to Swagger Authorize', description: 'Roles come from database on every protected API request.' })
  login(@Body() dto: LoginDto, @Req() req: { ip?: string }) { return this.auth.login(dto.email, dto.password, false, req.ip ?? 'unknown'); }
}
