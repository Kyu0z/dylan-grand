import { Body, Controller, Get, Patch, Param, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/auth/auth.guard';
import { PrismaService } from '../../database/prisma.service';
import { HotelService } from '../../core/hotel.service';
import { UpdateHotelDto } from './dto/admin-contract.dto';

@ApiBearerAuth('access-token')
@ApiTags('Admin · Hotel')
@Roles('ADMIN', 'MANAGER')
@Controller('admin/hotel')
export class AdminHotelController {
  constructor(private readonly hotel: HotelService, private readonly db: PrismaService) { }
  @Get() @ApiOperation({ summary: '[DB] Property settings' }) details() { return this.hotel.hotel(); }
  @Get('inquiries') @ApiOperation({ summary: 'List guest enquiries' })
  inquiries() { return this.db.contactInquiry.findMany({ orderBy: [{ resolved: 'asc' }, { createdAt: 'desc' }], take: 200 }); }
  @Patch('inquiries/:id/resolve') @ApiOperation({ summary: 'Mark enquiry handled' })
  resolve(@Param('id') id: string, @Req() req: { user: { id: string; }; }) { return this.db.$transaction(async tx => { const record = await tx.contactInquiry.update({ where: { id }, data: { resolved: true, resolvedAt: new Date() } }); await tx.auditLog.create({ data: { actorId: req.user.id, operation: 'RESOLVE_ENQUIRY', entity: 'ContactInquiry', entityId: id } }); return record; }); }
  @Patch() @ApiOperation({ summary: '[DB] Update property name or contact email' })
  update(@Body() dto: UpdateHotelDto, @Req() req: { user: { id: string; }; }) { return this.hotel.updateHotel(dto, req.user.id); }
}
