import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail, IsEnum, IsInt, IsOptional, IsString,
  Matches, Max, MaxLength, Min, MinLength,
} from 'class-validator';

export class UpdateHotelDto {
  @ApiPropertyOptional({ example: 'Dylan Grand Hotel' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nameEn?: string;

  @ApiPropertyOptional({ example: 'Khách sạn Dylan Grand' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nameVi?: string;

  @ApiPropertyOptional({ example: 'contact@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class CreateRoomTypeDto {
  @ApiProperty({ example: 'deluxe' })
  @Matches(/^[a-z0-9-]{2,40}$/)
  code!: string;

  @ApiProperty({ example: 'Deluxe Room' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nameEn!: string;

  @ApiProperty({ example: 'Phòng Deluxe' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nameVi!: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(20)
  maxGuests!: number;
}

export class CreatePhysicalRoomDto {
  @ApiProperty({ example: '201' })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  number!: string;

  @ApiProperty({ example: 'deluxe' })
  @Matches(/^[a-z0-9-]{2,40}$/)
  roomTypeCode!: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(0)
  @Max(200)
  floor!: number;
}

export class CreateMaintenanceBlockDto {
  @ApiProperty({ example: '201' })
  @IsString()
  roomNumber!: string;

  @ApiProperty({ example: '2026-12-04' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate!: string;

  @ApiProperty({ example: '2026-12-07', description: 'Exclusive date.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate!: string;

  @ApiProperty({ example: 'Air-conditioning maintenance' })
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  reason!: string;
}

export class SetBaseRateDto {
  @ApiProperty({ example: 2250000, description: 'Indicative rate in VND; actual pricing rules must be approved.' })
  @IsInt()
  @Min(0)
  amountVnd!: number;
}

export class RecordPaymentDto {
  @ApiProperty({ example: 1500000, minimum: 1 })
  @IsInt()
  @Min(1)
  amountVnd!: number;

  @ApiProperty({ enum: ['CASH', 'BANK_TRANSFER'], example: 'CASH' })
  @IsEnum(['CASH', 'BANK_TRANSFER'])
  method!: 'CASH' | 'BANK_TRANSFER';
}

export class UpdateHousekeepingDto {
  @ApiProperty({ enum: ['DIRTY', 'CLEAN', 'INSPECTED'], example: 'CLEAN' })
  @IsEnum(['DIRTY', 'CLEAN', 'INSPECTED'])
  status!: 'DIRTY' | 'CLEAN' | 'INSPECTED';
}

export class CreateStaffDto {
  @ApiProperty({ example: 'staff@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPING'], example: 'RECEPTIONIST' })
  @IsEnum(['ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPING'])
  role!: 'ADMIN' | 'MANAGER' | 'RECEPTIONIST' | 'HOUSEKEEPING';
}

export class CreatePromotionDto {
  @ApiProperty({ example: 'WELCOME10' })
  @Matches(/^[A-Z0-9_-]{3,32}$/)
  code!: string;

  @ApiProperty({ example: 10, description: 'Concept percentage. Final discount constraints are not approved.' })
  @IsInt()
  @Min(1)
  @Max(100)
  discountPercent!: number;
}
