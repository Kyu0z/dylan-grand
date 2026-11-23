import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/auth/auth.guard';
import { ReportQueryDto } from '../../core/contracts';
import { ReportService } from '../../core/report.service';

@ApiBearerAuth('access-token')
@ApiTags('Admin · Reports')
@Roles('ADMIN','MANAGER')
@Controller('admin/reports')
export class AdminReportsController {
  constructor(private readonly reports: ReportService) {}
  @Get() @ApiOperation({ summary: '[DB] Date-range occupancy, booked room revenue, collected cash, ADR and RevPAR', description: 'Booked room revenue (not accounting recognized revenue). Max range 366 days.' })
  summary(@Query() dto: ReportQueryDto) { return this.reports.report(dto); }
}
