import { AdminDashboardController } from './dashboard.controller';
import { AdminHotelController } from './hotel.controller';
import { AdminRoomTypesController } from './room-types.controller';
import { AdminPhysicalRoomsController } from './physical-rooms.controller';
import { AdminInventoryController } from './inventory.controller';
import { AdminPricingController } from './pricing.controller';
import { AdminReservationsController } from './reservations.controller';
import { AdminFrontDeskController } from './front-desk.controller';
import { AdminPaymentsController } from './payments.controller';
import { AdminHousekeepingController } from './housekeeping.controller';
import { AdminGuestsController } from './guests.controller';
import { AdminPromotionsController } from './promotions.controller';
import { AdminStaffController } from './staff.controller';
import { AdminReportsController } from './reports.controller';

export const ADMIN_CONTROLLERS = [
  AdminDashboardController,
  AdminHotelController,
  AdminRoomTypesController,
  AdminPhysicalRoomsController,
  AdminInventoryController,
  AdminPricingController,
  AdminReservationsController,
  AdminFrontDeskController,
  AdminPaymentsController,
  AdminHousekeepingController,
  AdminGuestsController,
  AdminPromotionsController,
  AdminStaffController,
  AdminReportsController,
] as const;
