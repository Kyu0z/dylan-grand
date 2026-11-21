import { Module } from '@nestjs/common';
import { ADMIN_CONTROLLERS } from './admin.controllers';

@Module({ controllers: [...ADMIN_CONTROLLERS] })
export class AdminModule {}
