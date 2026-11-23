import { ApiProperty } from '@nestjs/swagger';

export class RoomTypeRecordDto {
  @ApiProperty({ example: 'cm123abc456' })
  id!: string;

  @ApiProperty({ example: 'deluxe' })
  code!: string;

  @ApiProperty({ example: 'Deluxe Room' })
  nameEn!: string;

  @ApiProperty({ example: 'Phòng Deluxe' })
  nameVi!: string;

  @ApiProperty({ example: 2 })
  maxGuests!: number;

  @ApiProperty({ example: false, description: 'New room types are unpublished by default.' })
  isPublished!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class PhysicalRoomRecordDto {
  @ApiProperty({ example: 'cm123xyz789' })
  id!: string;

  @ApiProperty({ example: '201' })
  number!: string;

  @ApiProperty({ example: 2 })
  floor!: number;

  @ApiProperty({ example: 'deluxe' })
  roomTypeCode!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
