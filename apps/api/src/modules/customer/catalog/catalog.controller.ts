import { Body, Controller, Get, Param, Post, Req, HttpException, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsIn, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PrismaService } from '../../../database/prisma.service';
import { FinanceService } from '../../../core/finance.service';
import { HotelService } from '../../../core/hotel.service';
class ContactDto {
  @ApiProperty()
  @IsString()
  @Matches(/\S/)
  @MaxLength(120)
  name!: string;
  @ApiProperty()
  @IsEmail()
  @MaxLength(180)
  email!: string;
  @ApiProperty()
  @IsIn(['General enquiry', 'Reservation enquiry', 'Experiences'])
  topic!: string;
  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  @Matches(/\S/)
  message!: string;
}
@Controller()
export class CustomerCatalogController {
  constructor(private readonly hotel: HotelService, private readonly finance: FinanceService, private readonly db: PrismaService) { }
  private readonly contacts = new Map<string, {
    count: number;
    until: number;
  }>();
  @Post('contact')
  @ApiTags('Customer · Hotel')
  async contact(
    @Body()
    dto: ContactDto,
    @Req()
    req: {
      ip?: string;
    }) {
    const now = Date.now();
    for (const [key, value] of this.contacts)
      if (value.until <= now)
        this.contacts.delete(key);
    const key = req.ip ?? 'unknown';
    const entry = this.contacts.get(key) ?? { count: 0, until: now + 600000 };
    if (entry.count >= 5 || this.contacts.size >= 10000)
      throw new HttpException('Too many requests. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    entry.count++;
    this.contacts.set(key, entry);
    const record = await this.db.contactInquiry.create({ data: { name: dto.name.trim(), email: dto.email.trim().toLowerCase(), topic: dto.topic, message: dto.message.trim() } });
    return { id: record.id, message: 'Enquiry submitted successfully.' };
  }
  @Get('services')
  @ApiTags('Customer · Hotel')
  async services() { return (await this.finance.services()).filter(x => x.isActive).map(({ code, name, unit, priceVnd, nameVi, unitVi, eyebrowEn, eyebrowVi, descriptionEn, descriptionVi, imageUrl }) => ({ code, name, unit, priceVnd, nameVi, unitVi, eyebrowEn, eyebrowVi, descriptionEn, descriptionVi, imageUrl })); }
  @Get('reviews')
  @ApiTags('Customer · Hotel')
  reviews() { return this.finance.publicReviews(); }
  @Get('hotel')
  @ApiTags('Customer · Hotel')
  @ApiOperation({ summary: '[DB] Public property information' })
  getHotel() { return this.hotel.hotel(); }
  @Get('rate-plans')
  @ApiTags('Customer · Rooms')
  async ratePlans() { return (await this.hotel.ratePlans()).filter(p => p.active); }
  @Get('rooms')
  @ApiTags('Customer · Rooms')
  @ApiOperation({ summary: '[DB] Published room types with current base prices' })
  getRoomTypes() { return this.hotel.roomTypes(true); }
  @Get('rooms/:code')
  @ApiTags('Customer · Rooms')
  @ApiOperation({ summary: '[DB] Published room type detail' })
  getRoomType(
    @Param('code')
    code: string) { return this.hotel.roomType(code, true); }
}
