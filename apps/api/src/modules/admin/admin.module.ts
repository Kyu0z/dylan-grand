import { Module } from '@nestjs/common';
import { ADMIN_CONTROLLERS } from './admin.controllers';
import { AdminCatalogService } from './catalog.service';

@Module({ controllers: [...ADMIN_CONTROLLERS], providers: [AdminCatalogService] })
export class AdminModule {}
