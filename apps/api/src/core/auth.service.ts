import {
  BadRequestException, ConflictException, ForbiddenException, Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { issueResetToken, readResetToken, verifyResetToken, passwordVersion, sendResetEmail, resetEmailConfig, limitResetRequest } from './password-reset';
import { PrismaService } from '../database/prisma.service';
import { CreateEmployeeDto, RegisterDto, SetupAdminDto, UpdateRoleDto } from './contracts';

function passwordHash(password: string): string {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
function passwordMatches(password: string, value: string): boolean {
  const [salt, hash] = value.split(':');
  if (!salt || !hash || !/^[a-f0-9]{128}$/.test(hash)) return false;
  const candidate = scryptSync(password, salt, 64);
  return timingSafeEqual(candidate, Buffer.from(hash, 'hex'));
}
function secret(): string {
  const value = process.env.JWT_ACCESS_SECRET;
  if (!value || value.length < 32) throw new Error('JWT_ACCESS_SECRET must contain at least 32 characters.');
  return value;
}
function base64(value: object): string { return Buffer.from(JSON.stringify(value)).toString('base64url'); }

@Injectable()
export class AuthService {
  constructor(private readonly db: PrismaService) {}

  async setup(dto: SetupAdminDto) {
    if (process.env.NODE_ENV === 'production') throw new ForbiddenException('Admin bootstrap is disabled in production.');
    const key = process.env.BOOTSTRAP_KEY;
    if (!key || key.length < 16 || dto.setupKey !== key) throw new ForbiddenException('Invalid bootstrap key.');
    const existing = await this.db.user.count({ where: { role: 'ADMIN' } });
    if (existing !== 0) throw new ConflictException('Admin is already set up.');
    return this.db.user.create({ data: { email: dto.email.toLowerCase(), passwordHash: passwordHash(dto.password), role: 'ADMIN' }, select: { id: true, email: true, role: true } });
  }

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    if (await this.db.user.findUnique({ where: { email } })) throw new ConflictException('Email already registered.');
    const fullName = dto.fullName.trim();
    if (!fullName) throw new BadRequestException('Full name is required.');
    try {
      const user = await this.db.user.create({
        data: { email, passwordHash: passwordHash(dto.password), guestProfile: { create: { name: fullName, email } } },
        select: { id: true, email: true, role: true },
      });
      return { ...user, fullName };
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('Email already registered.');
      }
      throw error;
    }
  }

  async login(email: string, password: string) {
    const user = await this.db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.isActive || !passwordMatches(password, user.passwordHash)) throw new UnauthorizedException('Invalid credentials.');
    const issuedAt = Math.floor(Date.now() / 1000);
    const header = base64({ alg: 'HS256', typ: 'JWT' });
    const payload = base64({ sub: user.id, iss: 'dylan-grand-api', aud: 'dylan-grand', iat: issuedAt, exp: issuedAt + 8 * 3600, ...(user.role === 'CUSTOMER' ? { pv: passwordVersion(user.passwordHash, secret()) } : {}) });
    const input = `${header}.${payload}`;
    const signature = createHmac('sha256', secret()).update(input).digest('base64url');
    return { accessToken: `${input}.${signature}`, tokenType: 'Bearer', expiresIn: 8 * 3600, role: user.role };
  }

  async verify(token: string) {
    const parts = token.split('.');
    if (parts.length !== 3) throw new UnauthorizedException('Invalid access token.');
    const [header, payload, sig] = parts;
    if (!header || !payload || !sig || header !== base64({ alg: 'HS256', typ: 'JWT' })) throw new UnauthorizedException('Invalid token header.');
    const expected = createHmac('sha256', secret()).update(`${header}.${payload}`).digest();
    const received = Buffer.from(sig, 'base64url');
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) throw new UnauthorizedException('Invalid signature.');
    let claims: { sub?: string; exp?: number; iss?: string; aud?: string; pv?: string };
    try { claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); }
    catch { throw new UnauthorizedException('Invalid token payload.'); }
    if (!claims.sub || claims.iss !== 'dylan-grand-api' || claims.aud !== 'dylan-grand' || !claims.exp || claims.exp <= Date.now() / 1000) {
      throw new UnauthorizedException('Expired or invalid access token.');
    }
    const user = await this.db.user.findUnique({ where: { id: claims.sub }, select: { id: true, email: true, role: true, isActive: true, passwordHash: true } });
    if (!user?.isActive) throw new UnauthorizedException('Account disabled.');
    if (user.role === 'CUSTOMER' && claims.pv !== passwordVersion(user.passwordHash, secret())) {
      throw new UnauthorizedException('Expired or invalid access token.');
    }
    return { id: user.id, email: user.email, role: user.role, isActive: user.isActive };
  }

  async forgotPassword(email: string, ip: string, locale: 'en' | 'vi' = 'en') {
    const normalized = email.trim().toLowerCase();
    const config = resetEmailConfig();
    limitResetRequest('request-ip', ip, 30, 15 * 60_000);
    // Silently suppress repeated requests for the same email (known or unknown).
    const response = { message: 'If an eligible account exists, a reset link will be sent.' };
    if (!limitResetRequest('request-email', normalized, 1, 60_000, true)) return response;
    const user = await this.db.user.findUnique({ where: { email: normalized } });
    if (user?.isActive && user.role === 'CUSTOMER') {
      const token = issueResetToken(user.id, user.passwordHash, secret());
      await sendResetEmail(config, normalized, token, locale);
    }
    return response;
  }

  async resetPassword(token: string, password: string, ip: string) {
    limitResetRequest('confirm-ip', ip, 30, 15 * 60_000);
    const invalid = () => new BadRequestException('Reset link is invalid or expired.');
    const claims = readResetToken(token);
    if (!claims) throw invalid();
    const user = await this.db.user.findUnique({ where: { id: claims.sub } });
    if (!user?.isActive || user.role !== 'CUSTOMER' || !verifyResetToken(token, user.passwordHash, secret())) throw invalid();
    // Atomic compare-and-swap: a successful reset invalidates every outstanding link and customer JWT.
    const result = await this.db.user.updateMany({
      where: { id: user.id, passwordHash: user.passwordHash, isActive: true, role: 'CUSTOMER' },
      data: { passwordHash: passwordHash(password) },
    });
    if (result.count !== 1) throw invalid();
    return { message: 'Password updated. Please sign in.' };
  }

  async customerProfile(userId: string) {
    const user = await this.db.user.findUnique({ where: { id: userId }, select: {
      id: true, email: true, guestProfile: { select: { name: true, phone: true } },
    } });
    if (!user) throw new UnauthorizedException('Account not found.');
    return { id: user.id, email: user.email, fullName: user.guestProfile?.name ?? '', phone: user.guestProfile?.phone ?? '' };
  }

  async updateCustomerProfile(userId: string, email: string, fullName: string, phone: string) {
    const name = fullName.trim();
    if (!name) throw new BadRequestException('Full name is required.');
    const guest = await this.db.guest.upsert({ where: { accountId: userId },
      create: { accountId: userId, email, name, phone: phone.trim() || null },
      update: { name, phone: phone.trim() || null },
    });
    return { id: userId, email, fullName: guest.name, phone: guest.phone ?? '' };
  }

  listStaff() { return this.db.user.findMany({ where: { role: { not: 'CUSTOMER' } }, select: { id: true, email: true, role: true, isActive: true, createdAt: true }, orderBy: { createdAt: 'desc' } }); }

  async createStaff(dto: CreateEmployeeDto) {
    if (dto.role === 'CUSTOMER') throw new BadRequestException('Use customer registration.');
    const email = dto.email.toLowerCase();
    if (await this.db.user.findUnique({ where: { email } })) throw new ConflictException('Email already registered.');
    return this.db.user.create({ data: { email, passwordHash: passwordHash(dto.password), role: dto.role as 'ADMIN' | 'MANAGER' | 'RECEPTIONIST' | 'HOUSEKEEPING' }, select: { id: true, email: true, role: true, isActive: true } });
  }

  async setActive(userId: string, isActive: boolean, actorId: string) {
    if (userId === actorId) throw new BadRequestException('Cannot disable your own account.');
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user || user.role === 'CUSTOMER') throw new BadRequestException('Staff account not found.');
    const updated = await this.db.user.update({ where: { id: userId }, data: { isActive }, select: { id: true, email: true, role: true, isActive: true } });
    await this.db.auditLog.create({ data: { actorId, operation: 'SET_STAFF_ACTIVE', entity: 'User', entityId: userId, detail: { isActive } } });
    return updated;
  }

  async changeRole(userId: string, dto: UpdateRoleDto, actorId: string) {
    if (userId === actorId) throw new BadRequestException('You cannot change your own role.');
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found.');
    const updated = await this.db.user.update({ where: { id: userId }, data: { role: dto.role as 'ADMIN' | 'MANAGER' | 'RECEPTIONIST' | 'HOUSEKEEPING' }, select: { id: true, email: true, role: true } });
    await this.db.auditLog.create({ data: { actorId, operation: 'CHANGE_STAFF_ROLE', entity: 'User', entityId: userId, detail: { previousRole: user.role, newRole: dto.role } } });
    return updated;
  }
}
