import { ForbiddenException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';

const client = new OAuth2Client();

export function googleClientId(): string {
  const id = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!id) throw new ServiceUnavailableException('Google sign-in is not configured.');
  return id;
}

export function assertGoogleOrigin(origin: string | undefined): asserts origin is string {
  const origins = (process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:3000,http://localhost:5173')
    .split(',').map(value => value.trim()).filter(Boolean);
  if (!origin || origin.length > 300 || !origins.includes(origin)) {
    throw new ForbiddenException('Google sign-in origin is not allowed.');
  }
}

export function readGoogleIdentity(payload: TokenPayload | undefined, nonce: string) {
  const email = payload?.email?.trim().toLowerCase();
  // Google is authoritative for Gmail and verified Workspace addresses. External
  // email addresses require a separate ownership verification flow (not enabled).
  if (!payload?.sub || payload.sub.length > 255 || !email || email.length > 180 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || payload.email_verified !== true ||
    !(email.endsWith('@gmail.com') || Boolean(payload.hd)) || (payload as TokenPayload & { nonce?: string }).nonce !== nonce) {
    throw new UnauthorizedException('Google identity could not be verified. Use a Gmail or Google Workspace account.');
  }
  const picture = payload.picture && payload.picture.length <= 2048 && payload.picture.startsWith('https://')
    ? payload.picture : null;
  return { sub: payload.sub, email, name: (payload.name?.trim() || email.split('@')[0] || 'Guest').slice(0, 120), picture };
}

export async function verifyGoogleIdentity(credential: string, nonce: string) {
  const audience = googleClientId();
  let payload: TokenPayload | undefined;
  try {
    const ticket = await client.verifyIdToken({ idToken: credential, audience });
    payload = ticket.getPayload();
  } catch {
    throw new UnauthorizedException('Google sign-in failed. Please try again.');
  }
  return readGoogleIdentity(payload, nonce);
}
