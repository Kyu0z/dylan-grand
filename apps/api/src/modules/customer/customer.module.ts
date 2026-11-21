import { Module } from '@nestjs/common';
import { CustomerCatalogController } from './catalog/catalog.controller';
import { CustomerAvailabilityController } from './availability/availability.controller';
import { CustomerBookingsController } from './bookings/bookings.controller';
import { CustomerPaymentsController } from './payments/payments.controller';
import { CustomerAccountController } from './account/account.controller';

@Module({
  controllers: [
    CustomerCatalogController,
    CustomerAvailabilityController,
    CustomerBookingsController,
    CustomerPaymentsController,
    CustomerAccountController,
  ],
})
export class CustomerModule {}
