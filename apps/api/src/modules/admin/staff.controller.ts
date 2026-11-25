import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles, type SessionUser } from '../../common/auth/auth.guard';
import { AuthService } from '../../core/auth.service';
import { CreateEmployeeDto, SetActiveDto, UpdateRoleDto } from '../../core/contracts';
import { IsIn, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
class InvitationDto {
  @ApiPropertyOptional({ enum: ['en', 'vi'] }) @IsOptional() @IsIn(['en', 'vi']) locale?: 'en' | 'vi';
}
@ApiBearerAuth('access-token')
@ApiTags('Admin · Staff & Roles')
@Roles('ADMIN', 'MANAGER')
@Controller('admin/staff')
export class AdminStaffController {
  constructor(private readonly auth: AuthService) {}
  @Get() @ApiOperation({ summary: 'List staff within current actor permissions' }) list(@Req() req: { user: SessionUser }) { return this.auth.listStaff(req.user.role); }
  @Post() @ApiOperation({ summary: 'Create pending staff account and send invitation' }) create(@Body() dto: CreateEmployeeDto, @Req() req: { user: SessionUser }) { return this.auth.createStaff(dto, req.user); }
  @Post(':id/resend-invitation') @ApiOperation({ summary: 'Resend activation invitation' }) resend(@Param('id') id: string, @Body() dto: InvitationDto, @Req() req: { user: SessionUser }) { return this.auth.resendStaffInvitation(id, req.user, dto.locale ?? 'en'); }
  @Patch(':id/active') @ApiOperation({ summary: 'Enable or disable staff account' }) active(@Param('id') id: string, @Body() dto: SetActiveDto, @Req() req: { user: SessionUser }) { return this.auth.setActive(id, dto.isActive, req.user); }
  @Patch(':id/role') @ApiOperation({ summary: 'Update staff role within current actor permissions' }) role(@Param('id') id: string, @Body() dto: UpdateRoleDto, @Req() req: { user: SessionUser }) { return this.auth.changeRole(id, dto, req.user); }
}
