import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthResponseDto } from '../modules/shared/health/dto/health-response.dto';

@ApiTags('Shared · Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: '[LIVE] Check API health', description: 'No database connection required.' })
  @ApiOkResponse({ type: HealthResponseDto })
  getHealth(): HealthResponseDto {
    return { status: 'ok', service: 'dylan-grand-api' };
  }
}
