import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { ApiPlanned, pendingFeature } from '../../common/pending-feature';
import { CreateStaffDto } from './dto/admin-contract.dto';

@ApiTags('Admin · Staff & Roles')
@Controller('admin/staff')
export class AdminStaffController {
  @Get()
  @ApiPlanned('List staff members', 'Identity and RBAC are not active, so no private records are returned.')
  list(): never {
    return pendingFeature('List staff members');
  }

  @Post()
  @ApiPlanned('Create staff member', 'Requires verified admin identity and an audited role assignment.')
  @ApiBody({ type: CreateStaffDto })
  create(@Body() _dto: CreateStaffDto): never {
    return pendingFeature('Create staff member');
  }
}
