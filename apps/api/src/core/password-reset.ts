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

// Use one authorized sender mailbox. Recipients never need Google OAuth.
function validMailbox(email: string) {
  return !/[\r\n]/.test(email) && /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+$/.test(email);
}

export function resetEmailConfig() {
  const clientId = process.env.GMAIL_CLIENT_ID?.trim();
  const clientSecret = process.env.GMAIL_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN?.trim();
  const sender = process.env.GMAIL_SENDER_EMAIL?.trim();
  try {
    const url = new URL(process.env.CUSTOMER_RESET_URL ?? '');
    const local = process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(url.hostname) && url.protocol === 'http:';
    if (!clientId || !clientSecret || !refreshToken || !sender || !validMailbox(sender) ||
      (!local && url.protocol !== 'https:') || url.username || url.password || url.hash || url.search || url.pathname !== '/account') {
      throw new Error();
    }
    return { clientId, clientSecret, refreshToken, sender, url };
  } catch { throw new ServiceUnavailableException('Password reset is temporarily unavailable.'); }
}

type ResetEmailConfig = ReturnType<typeof resetEmailConfig>;

// Request an access token with the long-lived OAuth refresh token. No customer OAuth is involved.
async function getGmailAccessToken(config: ResetEmailConfig): Promise<string | null> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    signal: AbortSignal.timeout(7_000),
    body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret,
      refresh_token: config.refreshToken, grant_type: 'refresh_token' }),
  });
  if (!response.ok) {
    // Never log response bodies, OAuth credentials, recipient addresses or reset links.
    logger.error(`Gmail OAuth token request returned HTTP ${response.status}.`);
    return null;
  }
  const payload = await response.json() as { access_token?: unknown };
  if (typeof payload.access_token !== 'string' || !payload.access_token || /\s/.test(payload.access_token)) {
    logger.error('Gmail OAuth token response did not contain a valid access token.');
    return null;
  }
  return payload.access_token;
}

function encodeMime(sender: string, email: string, subject: string, text: string) {
  // RFC 2047 subject and UTF-8 MIME body; base64 lines are limited to 76 characters.
  // Sender and recipient are validated as single ASCII mailbox addresses before calling this.
  const encodedSubject = Buffer.from(subject, 'utf8').toString('base64');
  const encodedBody = Buffer.from(text, 'utf8').toString('base64').match(/.{1,76}/g)?.join('\r\n') ?? '';
  const message = [
    `From: Dylan Grand Hotel <${sender}>`,
    `To: <${email}>`,
    `Subject: =?UTF-8?B?${encodedSubject}?=`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    encodedBody,
    '',
  ].join('\r\n');
  return Buffer.from(message, 'utf8').toString('base64url');
}

export async function sendResetEmail(config: ResetEmailConfig, email: string, token: string, locale: 'en' | 'vi') {
  if (!validMailbox(email)) {
    logger.error('Gmail reset recipient is not a supported single mailbox address.');
    return;
  }
  const url = new URL(config.url);
  url.hash = new URLSearchParams({ resetToken: token }).toString();
  const vi = locale === 'vi';
  const subject = vi ? 'Dylan Grand Hotel - Đặt lại mật khẩu' : 'Dylan Grand Hotel — Reset your password';
  const text = vi ? `Sử dụng liên kết sau để đặt lại mật khẩu: ${url}\nLiên kết hết hạn sau 20 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.` :
    `Use this link to reset your password: ${url}\nThe link expires in 20 minutes. If you did not request it, ignore this email.`;
  let stage = 'OAuth token';
  try {
    const accessToken = await getGmailAccessToken(config);
    if (!accessToken) return;
    stage = 'delivery';
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({ raw: encodeMime(config.sender, email, subject, text) }),
    });
    if (!response.ok) logger.error(`Gmail reset email delivery returned HTTP ${response.status}.`);
  } catch { logger.error(`Gmail reset email ${stage} request failed.`); }
  // Never expose provider errors, account existence, or tokens through the public endpoint.
}
