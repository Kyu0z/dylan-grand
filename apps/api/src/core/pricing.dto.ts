import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsString, IsIn, IsOptional, Matches, Min, Max, MaxLength } from 'class-validator';
export class WeekendPricingDto {
  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;
  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(2000000000)
  surchargeVnd!: number;
}
export class SpecialRateDto {
  @ApiProperty()
  @IsString()
  @Matches(/\S/)
  @MaxLength(120)
  name!: string;
  @ApiProperty()
  @IsString()
  @Matches(/^(\*|[a-z0-9-]{2,40})$/)
  roomTypeCode!: string;
  @ApiProperty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate!: string;
  @ApiProperty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate!: string;
  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(2000000000)
  amountVnd!: number;
}
export class RatePolicyDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(99)
  discountPercent!: number;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(8760)
  freeCancellationHours?: number | null;
  @ApiProperty()
  @IsIn(['FIRST_NIGHT', 'FULL', 'NONE'])
  lateFee!: string;
  @ApiProperty()
  @IsIn(['FIRST_NIGHT', 'FULL', 'NONE'])
  noShowFee!: string;
  @ApiProperty()
  @IsBoolean()
  active!: boolean;
}
