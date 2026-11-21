import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { ApiPlanned, pendingFeature } from '../../../common/pending-feature';
import { LoginDto } from './dto/login.dto';

@ApiTags('Shared · Authentication')
@Controller('auth')
export class AuthController {
  @Post('login')
  @ApiPlanned('Sign in', 'Single identity service for Customer and Staff. JWT and RBAC are not implemented.')
  @ApiBody({ type: LoginDto })
  login(@Body() _dto: LoginDto): never {
    return pendingFeature('Authentication');
  }
}
