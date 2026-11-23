import { Global, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { HotelService } from './hotel.service';
import { BookingService } from './booking.service';
import { FinanceService } from './finance.service';
import { ReportService } from './report.service';

@Global()
@Module({
  providers: [AuthService, HotelService, BookingService, FinanceService, ReportService],
  exports: [AuthService, HotelService, BookingService, FinanceService, ReportService],
})
export class CoreModule {}
