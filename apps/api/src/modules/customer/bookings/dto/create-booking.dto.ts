import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Equals, IsEmail, IsInt, IsOptional, IsString, Matches, Max,
  MaxLength, Min, MinLength,
} from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ example: 'deluxe', description: 'Room type, not the physical room number.' })
  @IsString()
  @MinLength(1)
  roomTypeCode!: string;

  @ApiProperty({ example: '2026-12-04' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  checkIn!: string;

  @ApiProperty({ example: '2026-12-07' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  checkOut!: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  @Max(20)
  adults!: number;

  @ApiProperty({ example: 'Alex Nguyen', minLength: 1 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  guestName!: string;

  @ApiProperty({ example: 'guest@example.com', format: 'email' })
  @IsEmail()
  guestEmail!: string;

  @ApiPropertyOptional({ example: 'Late arrival, if available.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  specialRequests?: string;

  @ApiProperty({ example: true, description: 'Must be true before creating a booking.' })
  @Equals(true)
  acceptedTerms!: boolean;
}
