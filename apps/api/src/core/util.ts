import { BadRequestException } from '@nestjs/common';
import { createHash, createHmac, randomBytes } from 'node:crypto';

export const HOTEL_TZ = 'Asia/Ho_Chi_Minh';
export const HOLD_MINUTES = 15;
export const MAX_STAY_NIGHTS = 30;

export function day(input: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) throw new BadRequestException('Date must be YYYY-MM-DD.');
  const parsed = new Date(`${input}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== input) {
    throw new BadRequestException(`Invalid calendar date '${input}'.`);
  }
  return parsed;
}

export function hotelToday(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: HOTEL_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const part = (name: string) => parts.find((item) => item.type === name)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function nights(checkIn: string, checkOut: string, allowPast = false): Date[] {
  const start = day(checkIn).valueOf();
  const end = day(checkOut).valueOf();
  const length = (end - start) / 86_400_000;
  if (!Number.isInteger(length) || length < 1 || length > MAX_STAY_NIGHTS) {
    throw new BadRequestException(`Stay must be between 1 and ${MAX_STAY_NIGHTS} nights; checkout is exclusive.`);
  }
  if (!allowPast && checkIn < hotelToday()) throw new BadRequestException('Check-in date cannot be in the past.');
  return Array.from({ length }, (_, i) => new Date(start + i * 86_400_000));
}

export function sha(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function token(): string { return randomBytes(32).toString('hex'); }

export function bookingLookupToken(code: string, requestId: string): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret || secret.length < 32) throw new Error('JWT_ACCESS_SECRET (>=32 chars) must be configured.');
  return createHmac('sha256', secret).update(`${code}:${requestId}`).digest('hex');
}

export function roundMoney(value: number): number { return Math.round(value); }

export function assertVnd(value: number, field = 'amountVnd'): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > 2_000_000_000) {
    throw new BadRequestException(`${field} must be a safe integer amount in VND.`);
  }
}

export function isUnique(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2002');
}

export function isSerializationFailure(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2034');
}
