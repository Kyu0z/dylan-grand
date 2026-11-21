import { ApiProperty } from '@nestjs/swagger';

export class HotelPreviewDto {
  @ApiProperty({ example: 'dylan-grand-hotel' })
  code!: string;

  @ApiProperty({ example: 'Dylan Grand Hotel' })
  name!: string;

  @ApiProperty({ type: [String], example: ['en', 'vi'] })
  languages!: string[];

  @ApiProperty({ example: true, description: 'Preview only. Not loaded from the hotel database.' })
  demo!: boolean;
}

export class RoomTypePreviewDto {
  @ApiProperty({ example: 'deluxe' })
  code!: string;

  @ApiProperty({ example: 'Deluxe Room' })
  name!: string;

  @ApiProperty({ example: 32, description: 'Room size in square metres.' })
  sizeSqm!: number;

  @ApiProperty({ example: 2 })
  maxGuests!: number;

  @ApiProperty({ example: 'King bed' })
  beds!: string;

  @ApiProperty({ example: 2250000, description: 'Concept-only base price in VND, NOT a live quote.' })
  indicativePriceVnd!: number;

  @ApiProperty({ type: [String], example: ['Wi-Fi', 'Rain shower', 'Smart TV'] })
  amenities!: string[];

  @ApiProperty({ example: true })
  demo!: boolean;
}
