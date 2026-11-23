import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from './prisma.service';
import { DatabaseHealthDto } from './dto/database-health.dto';

@ApiTags('Shared · Health')
@Controller('health')
export class DatabaseHealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('database')
  @ApiOperation({
    summary: '[LIVE DB] Test PostgreSQL connection',
    description: 'Executes SELECT 1 against the configured PostgreSQL database. No credentials are returned.',
  })
  @ApiOkResponse({ type: DatabaseHealthDto })
  @ApiServiceUnavailableResponse({ description: 'Database is unreachable or credentials are invalid.' })
  async check(): Promise<DatabaseHealthDto> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'postgresql' };
    } catch {
      throw new ServiceUnavailableException('Database connection is unavailable.');
    }
  }
}
