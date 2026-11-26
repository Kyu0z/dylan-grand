import { Body, Controller, Get, Param, Post, Patch, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/auth/auth.guard';
import { FinanceService } from '../../core/finance.service';
import { ExtraServiceDto, PromotionDto, ServiceOrderDto, SetActiveDto } from '../../core/contracts';
@ApiBearerAuth('access-token')
@ApiTags('Admin · Promotions')
@Roles('ADMIN', 'MANAGER')
@Controller('admin/promotions')
export class AdminPromotionsController {
  constructor(private readonly finance: FinanceService) { }
  @Get()
  @ApiOperation({ summary: '[DB] Promotion codes and extra services' })
  async list() { return { promotions: await this.finance.promotions(), extraServices: await this.finance.services() }; }
  @Get('services')
  @Roles('ADMIN', 'MANAGER', 'RECEPTIONIST')
  services() { return this.finance.services(); }
  @Post()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: '[DB] Create single-use-per-booking percentage promotion, max 30%' })
  create(
    @Body()
    dto: PromotionDto) { return this.finance.createPromotion(dto); }
  @Post('generate-code')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Suggest an available promotion code (not reserved)' })
  generateCode() { return this.finance.generatePromotionCode(); }
  @Post('services')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: '[DB] Create extra service' })
  addService(
    @Body()
    dto: ExtraServiceDto) { return this.finance.createService(dto); }
  @Patch(':code/active')
  @Roles('ADMIN', 'MANAGER')
  promotionActive(
    @Param('code')
    code: string,
    @Body()
    dto: SetActiveDto,
    @Req()
    req: {
      user: {
        id: string;
      };
    }) { return this.finance.setPromotionActive(code, dto.isActive, req.user.id); }
  @Patch('services/:code/active')
  @Roles('ADMIN', 'MANAGER')
  serviceActive(
    @Param('code')
    code: string,
    @Body()
    dto: SetActiveDto,
    @Req()
    req: {
      user: {
        id: string;
      };
    }) { return this.finance.setServiceActive(code, dto.isActive, req.user.id); }
  @Post('reservations/:code/services')
  @Roles('ADMIN', 'MANAGER', 'RECEPTIONIST')
  @ApiOperation({ summary: '[DB] Order and charge extra service to folio' })
  order(
    @Param('code')
    code: string,
    @Body()
    dto: ServiceOrderDto,
    @Req()
    req: {
      user: {
        id: string;
      };
    }) { return this.finance.orderService(code, dto, req.user.id); }
  @Post('orders/:id/fulfill')
  @Roles('ADMIN', 'MANAGER', 'RECEPTIONIST')
  @ApiOperation({ summary: '[DB] Fulfill requested service' })
  fulfill(
    @Param('id')
    id: string,
    @Req()
    req: {
      user: {
        id: string;
      };
    }) { return this.finance.updateServiceOrder(id, 'FULFILLED', req.user.id); }
  @Post('orders/:id/cancel')
  @Roles('ADMIN', 'MANAGER', 'RECEPTIONIST')
  @ApiOperation({ summary: '[DB] Cancel unfulfilled service and reverse charge' })
  cancel(
    @Param('id')
    id: string,
    @Req()
    req: {
      user: {
        id: string;
      };
    }) { return this.finance.updateServiceOrder(id, 'CANCELLED', req.user.id); }
}
