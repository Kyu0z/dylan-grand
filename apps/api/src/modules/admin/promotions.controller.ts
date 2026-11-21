import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { ApiPlanned, pendingFeature } from '../../common/pending-feature';
import { CreatePromotionDto } from './dto/admin-contract.dto';

@ApiTags('Admin · Promotions')
@Controller('admin/promotions')
export class AdminPromotionsController {
  @Get()
  @ApiPlanned('List promotions and extras', 'Promotion applicability and stacking rules are not finalized.')
  list(): never {
    return pendingFeature('List promotions and extras');
  }

  @Post()
  @ApiPlanned('Create promotion', 'Actual limits and stacking rules must be approved.')
  @ApiBody({ type: CreatePromotionDto })
  create(@Body() _dto: CreatePromotionDto): never {
    return pendingFeature('Create promotion');
  }
}
