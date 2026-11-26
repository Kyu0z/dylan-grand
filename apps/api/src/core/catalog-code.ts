import { randomBytes } from 'node:crypto';
import { ConflictException } from '@nestjs/common';
import { isUnique } from './util';
const MAX_ATTEMPTS = 100;
export function normalizeCatalogCode(name: string, kind: 'room' | 'service'): string {
  const separator = kind === 'room' ? '-' : '_';
  const normalized = name.normalize('NFKD').replace(/\p{M}/gu, '').replace(/[đĐ]/g, 'd')
    .replace(/[^a-zA-Z0-9]+/g, separator).replace(/^[-_]+|[-_]+$/g, '');
  const code = kind === 'room' ? normalized.toLowerCase() : normalized.toUpperCase();
  const min = kind === 'room' ? 2 : 3;
  return (code.length >= min ? code : kind === 'room' ? 'room' : 'SERVICE').slice(0, 40).replace(/[-_]+$/g, '');
}
export function promotionCode(): string {
  return `DG-${randomBytes(5).toString('hex').toUpperCase()}`;
}
/** Retry the actual insert on unique conflicts; a preflight lookup alone is not race-safe. */
export async function createWithCode<T>(options: {
  explicit?: string;
  base?: string;
  separator?: '-' | '_';
  create: (code: string) => Promise<T>;
  conflictMessage: string;
}): Promise<T> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const suffix = attempt === 0 ? '' : `${options.separator ?? '-'}${attempt + 1}`;
    const code = options.explicit || (options.base
      ? options.base.slice(0, 40 - suffix.length).replace(/[-_]+$/g, '') + suffix
      : promotionCode());
    try {
      return await options.create(code);
    }
    catch (error) {
      if (!isUnique(error))
        throw error;
      if (options.explicit)
        throw new ConflictException(options.conflictMessage);
    }
  }
  throw new ConflictException(options.conflictMessage);
}
