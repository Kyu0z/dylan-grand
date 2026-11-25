import { Module } from '@nestjs/common';
import { DatabaseHealthController } from '../../database/database-health.controller';
import { HealthController } from '../../health/health.controller';
import { AuthController } from './auth/auth.controller';

import { StaffAuthController } from './auth/staff-auth.controller';

@Module({ controllers: [HealthController, DatabaseHealthController, AuthController, StaffAuthController] })
export class SharedModule {}
