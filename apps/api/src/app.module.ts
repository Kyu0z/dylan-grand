import { Module } from '@nestjs/common';
import { AdminModule } from './modules/admin/admin.module';
import { CustomerModule } from './modules/customer/customer.module';
import { SharedModule } from './modules/shared/shared.module';

// Three API surfaces; shared business services can later be exported by domain modules.
@Module({ imports: [SharedModule, CustomerModule, AdminModule] })
export class AppModule {}
