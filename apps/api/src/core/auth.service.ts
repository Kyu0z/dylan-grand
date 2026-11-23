import {
  BadRequestException, ConflictException, ForbiddenException, Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
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
    return this.db.user.create({ data: { email, passwordHash: passwordHash(dto.password) }, select: { id: true, email: true, role: true } });
  }

  async login(email: string, password: string) {
    const user = await this.db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.isActive || !passwordMatches(password, user.passwordHash)) throw new UnauthorizedException('Invalid credentials.');
    const issuedAt = Math.floor(Date.now() / 1000);
    const header = base64({ alg: 'HS256', typ: 'JWT' });
    const payload = base64({ sub: user.id, iss: 'dylan-grand-api', aud: 'dylan-grand', iat: issuedAt, exp: issuedAt + 8 * 3600 });
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
    let claims: { sub?: string; exp?: number; iss?: string; aud?: string };
    try { claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); }
    catch { throw new UnauthorizedException('Invalid token payload.'); }
    if (!claims.sub || claims.iss !== 'dylan-grand-api' || claims.aud !== 'dylan-grand' || !claims.exp || claims.exp <= Date.now() / 1000) {
      throw new UnauthorizedException('Expired or invalid access token.');
    }
    const user = await this.db.user.findUnique({ where: { id: claims.sub }, select: { id: true, email: true, role: true, isActive: true } });
    if (!user?.isActive) throw new UnauthorizedException('Account disabled.');
    return user;
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
