import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/auth/auth.guard';
import { AuthService } from '../../core/auth.service';
import { CreateEmployeeDto, SetActiveDto, UpdateRoleDto } from '../../core/contracts';

@ApiBearerAuth('access-token')
@ApiTags('Admin · Staff & Roles')
@Roles('ADMIN')
@Controller('admin/staff')
export class AdminStaffController {
  constructor(private readonly auth: AuthService) {}
  @Get() @ApiOperation({ summary: '[DB] List staff without password hashes' }) list() { return this.auth.listStaff(); }
  @Post() @ApiOperation({ summary: '[DB] Create staff identity with hashed password' }) create(@Body() dto: CreateEmployeeDto) { return this.auth.createStaff(dto); }
  @Patch(':id/active') @ApiOperation({ summary: '[DB] Enable/disable staff account' })
  active(@Param('id') id: string, @Body() dto: SetActiveDto, @Req() req: { user: { id: string } }) { return this.auth.setActive(id, dto.isActive, req.user.id); }
  @Patch(':id/role') @ApiOperation({ summary: '[DB] Update staff role; cannot change own role' })
  role(@Param('id') id: string, @Body() dto: UpdateRoleDto, @Req() req: { user: { id: string } }) { return this.auth.changeRole(id, dto, req.user.id); }
}
