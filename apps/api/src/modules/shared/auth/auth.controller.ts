import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from '../../../core/auth.service';
import { RegisterDto, SetupAdminDto } from '../../../core/contracts';
import { LoginDto } from './dto/login.dto';

@ApiTags('Shared · Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('setup-admin')
  @ApiOperation({ summary: '[DB] One-time admin bootstrap (development only)', description: 'Requires BOOTSTRAP_KEY and no existing admin. Disabled in production.' })
  setup(@Body() dto: SetupAdminDto) { return this.auth.setup(dto); }
  @Post('register')
  @ApiOperation({ summary: '[DB] Register customer account' })
  register(@Body() dto: RegisterDto) { return this.auth.register(dto); }
  @Post('login')
  @ApiOperation({ summary: '[DB] Login; copy accessToken to Swagger Authorize', description: 'Roles come from database on every protected API request.' })
  login(@Body() dto: LoginDto) { return this.auth.login(dto.email, dto.password); }
}
