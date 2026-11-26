import { BadRequestException, ConflictException } from '@nestjs/common';
import type { UpdateExtraServiceDto, UpdatePromotionDto } from './contracts';
export function promotionValues(dto: UpdatePromotionDto, used = 0) {
  const startsAt = new Date(dto.startsAt);
  const endsAt = new Date(dto.endsAt);
  if (!Number.isFinite(startsAt.valueOf()) || !Number.isFinite(endsAt.valueOf()) || endsAt <= startsAt) {
    throw new BadRequestException('Invalid promotion period.');
  }
  if (dto.usageLimit < used) {
    throw new ConflictException('Usage limit cannot be lower than the number of redemptions.');
  }
  return { discountPercent: dto.discountPercent, startsAt, endsAt, usageLimit: dto.usageLimit, isActive: dto.isActive ?? undefined };
}
export function serviceValues(dto: UpdateExtraServiceDto) {
  const optionalText = (value: string | null | undefined) => value === undefined ? undefined : value?.trim() || null;
  const imageUrl = optionalText(dto.imageUrl);
  if (imageUrl) {
    let url: URL;
    try {
      url = new URL(imageUrl);
    }
    catch {
      throw new BadRequestException('Choose a valid service image.');
    }
    const cloud = process.env.CLOUDINARY_CLOUD_NAME?.trim();
    if (!cloud || url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com' || url.port || url.username || url.password || !url.pathname.startsWith(`/${cloud}/image/upload/`)) {
      throw new BadRequestException('Choose a valid service image.');
    }
  }
  const name = dto.name.trim();
  const unit = dto.unit.trim();
  if (name.length < 2 || unit.length < 2)
    throw new BadRequestException('Service name and unit are required.');
  return {
    name, unit, priceVnd: dto.priceVnd, isActive: dto.isActive ?? undefined,
    nameVi: optionalText(dto.nameVi), unitVi: optionalText(dto.unitVi),
    eyebrowEn: optionalText(dto.eyebrowEn), eyebrowVi: optionalText(dto.eyebrowVi),
    descriptionEn: optionalText(dto.descriptionEn), descriptionVi: optionalText(dto.descriptionVi), imageUrl,
  };
}
export function assertPromotionUnused(usageCount: number, bookings: number) {
  if (usageCount > 0 || bookings > 0)
    throw new ConflictException('Promotion has booking history. Deactivate it instead of deleting.');
}
export function assertServiceUnused(orders: number) {
  if (orders > 0)
    throw new ConflictException('Service has order history. Deactivate it instead of deleting.');
}
