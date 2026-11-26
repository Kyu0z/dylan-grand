import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsUrl, ValidateNested, Equals, IsBoolean, IsEmail, IsIn, IsInt, IsISO8601, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, } from 'class-validator';
import { Transform, Type } from 'class-transformer';
function optionalCode(value: unknown, uppercase: boolean): unknown {
  if (typeof value !== 'string')
    return value;
  const trimmed = value.trim();
  return trimmed ? (uppercase ? trimmed.toUpperCase() : trimmed.toLowerCase()) : undefined;
}
export class CredentialsDto {
  @ApiProperty({ example: 'guest@example.com' })
  @IsEmail()
  @MaxLength(180)
  email!: string;
  @ApiProperty({ example: 'StrongPassword!2026', minLength: 12 })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;
}
export class RegisterDto extends CredentialsDto {
  @ApiProperty({ example: 'Nguyen Van An', maxLength: 120 })
  @IsString()
  @Matches(/\S/)
  @MaxLength(120)
  fullName!: string;
}
export class SetupAdminDto extends CredentialsDto {
  @ApiProperty({ description: 'Value of BOOTSTRAP_KEY in apps/api/.env' })
  @IsString()
  @MinLength(16)
  setupKey!: string;
}
export class CreateEmployeeDto {
  @ApiProperty()
  @IsEmail()
  @MaxLength(180)
  email!: string;
  @ApiProperty()
  @IsString()
  @Matches(/\S/)
  @MaxLength(120)
  fullName!: string;
  @ApiPropertyOptional({ enum: ['en', 'vi'] })
  @IsOptional()
  @IsIn(['en', 'vi'])
  locale?: 'en' | 'vi';
  @ApiProperty({ enum: ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPING'] })
  @IsIn(['ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPING'])
  role!: string;
}
export class UpdateRoleDto {
  @ApiProperty({ enum: ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPING'] })
  @IsIn(['ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPING'])
  role!: string;
}
export class SetRoomTypeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descriptionEn?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descriptionVi?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  sizeSqm?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bedsEn?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bedsVi?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  viewEn?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  viewVi?: string;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  amenities?: string[];
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl({ protocols: ['https'], require_protocol: true }, { each: true })
  @MaxLength(2000, { each: true })
  imageUrls?: string[];
  @ApiPropertyOptional({ example: 'deluxe', description: 'Omit to generate a unique code on the server.' })
  @Transform(({ value }) => optionalCode(value, false))
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]{2,40}$/)
  code?: string;
  @ApiProperty({ example: 'Deluxe Room' })
  @IsString()
  @Matches(/\S/)
  @MinLength(1)
  @MaxLength(100)
  nameEn!: string;
  @ApiProperty({ example: 'Phòng Deluxe' })
  @IsString()
  @Matches(/\S/)
  @MinLength(1)
  @MaxLength(100)
  nameVi!: string;
  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  maxGuests!: number;
  @ApiProperty({ example: 2250000 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2000000000)
  baseRateVnd!: number;
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
export class PatchRoomTypeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descriptionEn?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descriptionVi?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  sizeSqm?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bedsEn?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bedsVi?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  viewEn?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  viewVi?: string;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  amenities?: string[];
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl({ protocols: ['https'], require_protocol: true }, { each: true })
  @MaxLength(2000, { each: true })
  imageUrls?: string[];
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nameEn?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nameVi?: string;
  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  maxGuests?: number;
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
export class PatchPhysicalRoomDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  sellable?: boolean;
}
export class SetDailyRateDto {
  @ApiProperty({ example: '2026-12-24' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;
  @ApiProperty({ example: 2750000 })
  @IsInt()
  @Min(0)
  amountVnd!: number;
}
export class SearchDatesDto {
  @ApiProperty({ example: '2026-12-04' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  checkIn!: string;
  @ApiProperty({ example: '2026-12-07' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  checkOut!: string;
}
export class BookingExtraDto {
  @ApiProperty()
  @Matches(/^[A-Z0-9_-]{3,40}$/)
  serviceCode!: string;
  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(30)
  quantity!: number;
}
export class BookingQuoteDto extends SearchDatesDto {
  @ApiProperty()
  @Matches(/^[a-z0-9-]{2,40}$/)
  roomTypeCode!: string;
  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(20)
  adults!: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  children?: number;
  @ApiPropertyOptional({ enum: ['FLEXIBLE', 'NON_REFUNDABLE'] })
  @IsOptional()
  @IsIn(['FLEXIBLE', 'NON_REFUNDABLE'])
  ratePlan?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^[A-Z0-9_-]{3,32}$/)
  promotionCode?: string;
  @ApiPropertyOptional({ type: [BookingExtraDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => BookingExtraDto)
  extras?: BookingExtraDto[];
}
export class CustomerBookingDto extends SearchDatesDto {
  @ApiPropertyOptional({ type: [BookingExtraDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => BookingExtraDto)
  extras?: BookingExtraDto[];
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2000000000)
  expectedTotalVnd?: number;
  @ApiProperty({ example: 'reservation-test-001', description: 'Unique client idempotency key; reuse for retries to avoid duplicate bookings' })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  clientRequestId!: string;
  @ApiProperty({ example: 'deluxe' })
  @Matches(/^[a-z0-9-]{2,40}$/)
  roomTypeCode!: string;
  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  @Max(20)
  adults!: number;
  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  children?: number;
  @ApiProperty({ example: 'Alex Nguyen' })
  @IsString()
  @Matches(/\S/)
  @MinLength(1)
  @MaxLength(120)
  guestName!: string;
  @ApiProperty({ example: 'guest@example.com' })
  @IsEmail()
  @MaxLength(180)
  guestEmail!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  guestPhone?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  specialRequests?: string;
  @ApiPropertyOptional({ enum: ['FLEXIBLE', 'NON_REFUNDABLE'], default: 'FLEXIBLE' })
  @IsOptional()
  @IsIn(['FLEXIBLE', 'NON_REFUNDABLE'])
  ratePlan?: string;
  @ApiPropertyOptional({ enum: ['PAY_AT_HOTEL', 'HOLD'], default: 'PAY_AT_HOTEL' })
  @IsOptional()
  @IsIn(['PAY_AT_HOTEL', 'HOLD'])
  guaranteeMode?: string;
  @ApiPropertyOptional({ example: 'WELCOME10' })
  @IsOptional()
  @Matches(/^[A-Z0-9_-]{3,32}$/)
  promotionCode?: string;
  @ApiProperty({ example: true })
  @Equals(true)
  acceptedTerms!: boolean;
}
export class LookupBookingDto {
  @ApiProperty({ example: 'DGH-XXXXXXXX' })
  @IsString()
  code!: string;
  @ApiProperty({ description: 'Private lookup secret returned only at booking creation' })
  @IsString()
  @MinLength(32)
  lookupToken!: string;
}
export class CancelBookingDto {
  @ApiProperty({ example: 'Changed travel plans' })
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  reason!: string;
  @ApiPropertyOptional({ description: 'For guest bookings without login' })
  @IsOptional()
  @IsString()
  lookupToken?: string;
}
export class AssignRoomDto {
  @ApiProperty({ example: '201' })
  @IsString()
  @MinLength(1)
  roomNumber!: string;
  @ApiProperty({ example: 'Room prepared for guest' })
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  reason!: string;
}
export class NoShowDto {
  @ApiProperty({ example: 'Guest did not arrive before cutoff' })
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  reason!: string;
}
export class ExtendStayDto {
  @ApiProperty({ example: '2026-12-08' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  checkOut!: string;
}
export class ManualPaymentDto {
  @ApiProperty({ example: 1000000 })
  @IsInt()
  @Min(1)
  amountVnd!: number;
  @ApiProperty({ enum: ['CASH', 'BANK_TRANSFER'] })
  @IsIn(['CASH', 'BANK_TRANSFER'])
  method!: string;
  @ApiProperty({ example: 'frontdesk-2026-00001' })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  idempotencyKey!: string;
  @ApiPropertyOptional({ description: 'Bank transaction reference; mandatory for BANK_TRANSFER' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
export class ManualRefundDto extends ManualPaymentDto {
  @ApiProperty({ description: 'Must be true only AFTER actual cash/bank refund has been verified' })
  @Equals(true)
  externallyCompleted!: boolean;
}
export class ExtraServiceDto {
  @ApiPropertyOptional({ example: 'BREAKFAST', description: 'Omit to generate a unique code on the server.' })
  @Transform(({ value }) => optionalCode(value, true))
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9_-]{3,40}$/)
  code?: string;
  @ApiProperty({ example: 'Breakfast' })
  @IsString()
  @Matches(/\S/)
  @MinLength(2)
  @MaxLength(120)
  name!: string;
  @ApiProperty({ example: 'per guest' })
  @IsString()
  @MinLength(2)
  @Matches(/\S/)
  @MaxLength(40)
  unit!: string;
  @ApiProperty({ example: 250000 })
  @IsInt()
  @Min(0)
  @Max(2000000000)
  priceVnd!: number;
  @ApiPropertyOptional({ maxLength: 120, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nameVi?: string | null;
  @ApiPropertyOptional({ maxLength: 40, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  unitVi?: string | null;
  @ApiPropertyOptional({ maxLength: 120, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  eyebrowEn?: string | null;
  @ApiPropertyOptional({ maxLength: 120, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  eyebrowVi?: string | null;
  @ApiPropertyOptional({ maxLength: 2000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descriptionEn?: string | null;
  @ApiPropertyOptional({ maxLength: 2000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descriptionVi?: string | null;
  @ApiPropertyOptional({ maxLength: 1000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @IsUrl({ protocols: ['https'], require_protocol: true })
  imageUrl?: string | null;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
export class UpdateExtraServiceDto extends OmitType(ExtraServiceDto, ['code'] as const) {
}
export class ServiceOrderDto {
  @ApiProperty({ example: 'spa-order-001', description: 'Unique client idempotency key' })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  clientRequestId!: string;
  @ApiProperty({ example: 'BREAKFAST' })
  @IsString()
  serviceCode!: string;
  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  @Max(30)
  quantity!: number;
}
export class PromotionDto {
  @ApiPropertyOptional({ example: 'WELCOME10', description: 'Omit to generate a unique code on the server.' })
  @Transform(({ value }) => optionalCode(value, true))
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9_-]{3,32}$/)
  code?: string;
  @ApiProperty({ example: 10, maximum: 30 })
  @IsInt()
  @Min(1)
  @Max(30)
  discountPercent!: number;
  @ApiProperty({ example: '2026-12-01T00:00:00.000Z' })
  @IsString()
  @IsISO8601({ strict: true })
  @Matches(/(?:Z|[+-]\d{2}:\d{2})$/i)
  startsAt!: string;
  @ApiProperty({ example: '2027-01-01T00:00:00.000Z' })
  @IsString()
  @IsISO8601({ strict: true })
  @Matches(/(?:Z|[+-]\d{2}:\d{2})$/i)
  endsAt!: string;
  @ApiProperty({ example: 100 })
  @IsInt()
  @Min(1)
  @Max(2000000000)
  usageLimit!: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
export class UpdatePromotionDto extends OmitType(PromotionDto, ['code'] as const) {
}
export class ReviewDto {
  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  stars!: number;
  @ApiProperty({ example: 'Lovely stay, excellent service.' })
  @IsString()
  @Matches(/\S/)
  @MinLength(10)
  @MaxLength(2000)
  comment!: string;
  @ApiPropertyOptional({ description: 'Private booking lookup token; optional for the owning customer' })
  @IsOptional()
  @IsString()
  lookupToken?: string;
}
export class ReviewResponseDto {
  @ApiProperty({ example: 'Thank you for staying with us.' })
  @IsString()
  @MaxLength(2000)
  response!: string;
  @ApiProperty()
  @IsBoolean()
  isVisible!: boolean;
}
export class ReportQueryDto {
  @ApiPropertyOptional({ example: '2026-12-01' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;
  @ApiPropertyOptional({ example: '2027-01-01', description: 'Exclusive upper bound' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;
}
export class SetActiveDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  isActive!: boolean;
}
export class FolioAdjustmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  idempotencyKey?: string;
  @ApiProperty({ example: -100000, description: 'Signed VND: negative credit, positive additional charge' })
  @IsInt()
  @Min(-2000000000)
  @Max(2000000000)
  amountVnd!: number;
  @ApiProperty({ example: 'Manager approved late-checkout fee waiver' })
  @IsString()
  @MinLength(5)
  @MaxLength(300)
  reason!: string;
}
export class LateArrivalDto {
  @ApiProperty({ example: '2026-12-05T02:00:00.000Z', description: 'Expected arrival date-time in ISO 8601 UTC' })
  @IsString()
  expectedArrivalAt!: string;
  @ApiProperty({ example: 'Flight delayed' })
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  reason!: string;
}
