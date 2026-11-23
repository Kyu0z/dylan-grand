import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportService } from '../../core/report.service';

@ApiBearerAuth('access-token')
@ApiTags('Admin · Dashboard')
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly reports: ReportService) {}
  @Get() @ApiOperation({ summary: '[DB] Operational overview for current hotel-local day' })
  overview() { return this.reports.dashboard(); }
}
