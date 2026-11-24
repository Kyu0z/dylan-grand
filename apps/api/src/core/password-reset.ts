import { HttpException, HttpStatus, Logger, ServiceUnavailableException } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const lifetimeSeconds = 20 * 60;
const logger = new Logger('CustomerPasswordReset');
type Claims = { sub: string; exp: number; nonce: string; purpose: 'customer-password-reset' };

export function passwordVersion(hash: string, secret: string) {
  return createHmac('sha256', secret).update('customer-session\0').update(hash).digest('base64url');
}
function signature(payload: string, hash: string, secret: string) {
  return createHmac('sha256', secret).update('customer-password-reset\0').update(hash).update('\0').update(payload).digest();
}
export function issueResetToken(id: string, hash: string, secret: string) {
  const claims: Claims = { sub: id, exp: Math.floor(Date.now() / 1000) + lifetimeSeconds, nonce: randomBytes(24).toString('base64url'), purpose: 'customer-password-reset' };
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${payload}.${signature(payload, hash, secret).toString('base64url')}`;
}
export function readResetToken(token: string): Claims | null {
  if (token.length > 1024 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) return null;
  try {
    const claims = JSON.parse(Buffer.from(token.split('.')[0]!, 'base64url').toString('utf8')) as Claims;
    if (!claims || claims.purpose !== 'customer-password-reset' || typeof claims.sub !== 'string' || !claims.sub ||
      typeof claims.nonce !== 'string' || !Number.isSafeInteger(claims.exp) || claims.exp <= Date.now() / 1000) return null;
    return claims;
  } catch { return null; }
}
export function verifyResetToken(token: string, hash: string, secret: string) {
  if (!readResetToken(token)) return false;
  const [payload, sig] = token.split('.');
  const actual = Buffer.from(sig!, 'base64url');
  const expected = signature(payload!, hash, secret);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// Bounded, per-process abuse protection. Multi-instance deployments should use a shared limiter.
const limits = new Map<string, { count: number; until: number }>();
export function limitResetRequest(scope: string, key: string, max: number, windowMs: number, silent = false) {
  const now = Date.now();
  for (const [k, entry] of limits) if (entry.until <= now) limits.delete(k);
  const id = `${scope}:${key}`;
  let entry = limits.get(id);
  if (!entry) {
    if (limits.size >= 10_000) throw new HttpException('Too many requests. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    entry = { count: 0, until: now + windowMs };
    limits.set(id, entry);
  }
  if (entry.count >= max) {
    if (silent) return false;
    throw new HttpException('Too many requests. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
  }
  entry.count++;
  return true;
}

export function resetEmailConfig() {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESET_EMAIL_FROM?.trim();
  try {
    const url = new URL(process.env.CUSTOMER_RESET_URL ?? '');
    const local = process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(url.hostname) && url.protocol === 'http:';
    if (!key || !from || (!local && url.protocol !== 'https:') || url.username || url.password || url.hash || url.search || url.pathname !== '/account') throw new Error();
    return { key, from, url };
  } catch { throw new ServiceUnavailableException('Password reset is temporarily unavailable.'); }
}
export async function sendResetEmail(config: ReturnType<typeof resetEmailConfig>, email: string, token: string, locale: 'en' | 'vi') {
  const url = new URL(config.url);
  url.hash = new URLSearchParams({ resetToken: token }).toString();
  const vi = locale === 'vi';
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({ from: config.from, to: [email],
        subject: vi ? 'Dylan Grand Hotel — Đặt lại mật khẩu' : 'Dylan Grand Hotel — Reset your password',
        text: vi ? `Sử dụng liên kết sau để đặt lại mật khẩu: ${url}\nLiên kết hết hạn sau 20 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.` : `Use this link to reset your password: ${url}\nThe link expires in 20 minutes. If you did not request it, ignore this email.`,
      }),
    });
    if (!response.ok) logger.error(`Reset email provider returned HTTP ${response.status}.`);
  } catch { logger.error('Reset email delivery request failed.'); }
  // Never expose provider errors, account existence, or tokens through the public endpoint.
}
