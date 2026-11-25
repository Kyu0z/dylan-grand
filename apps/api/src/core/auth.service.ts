import {
  BadRequestException, ConflictException, ForbiddenException, Injectable,
  UnauthorizedException, ServiceUnavailableException,
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
  constructor(private readonly db: PrismaService) { }

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

  async staffLogin(email: string, password: string, ip: string) {
    return this.login(email, password, true, ip);
  }

  async login(email: string, password: string, staffOnly = false, ip?: string) {
    if (ip) limitResetRequest('login-ip', ip, 40, 15 * 60_000);
    const user = await this.db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.isActive || user.pendingActivation || (staffOnly && user.role === 'CUSTOMER') || !passwordMatches(password, user.passwordHash)) throw new UnauthorizedException('Invalid credentials.');
    const issuedAt = Math.floor(Date.now() / 1000);
    const header = base64({ alg: 'HS256', typ: 'JWT' });
    const payload = base64({ sub: user.id, iss: 'dylan-grand-api', aud: 'dylan-grand', iat: issuedAt, exp: issuedAt + 8 * 3600, pv: passwordVersion(user.passwordHash, secret()), ...(user.role === 'CUSTOMER' ? {} : { sv: user.staffSessionVersion }) });
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
    let claims: { sub?: string; exp?: number; iss?: string; aud?: string; pv?: string; sv?: number; };
    try { claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); }
    catch { throw new UnauthorizedException('Invalid token payload.'); }
    if (!claims.sub || claims.iss !== 'dylan-grand-api' || claims.aud !== 'dylan-grand' || !claims.exp || claims.exp <= Date.now() / 1000) {
      throw new UnauthorizedException('Expired or invalid access token.');
    }
    const user = await this.db.user.findUnique({ where: { id: claims.sub }, select: { id: true, email: true, role: true, isActive: true, passwordHash: true, pendingActivation: true, staffSessionVersion: true } });
    if (!user?.isActive || user.pendingActivation) throw new UnauthorizedException('Account disabled.');
    if (claims.pv !== passwordVersion(user.passwordHash, secret()) || (user.role !== 'CUSTOMER' && claims.sv !== user.staffSessionVersion)) {
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
    const user = await this.db.user.findUnique({
      where: { id: userId }, select: {
        id: true, email: true, guestProfile: { select: { name: true, phone: true, preferences: true } },
      }
    });
    if (!user) throw new UnauthorizedException('Account not found.');
    return { id: user.id, email: user.email, fullName: user.guestProfile?.name ?? '', phone: user.guestProfile?.phone ?? '', preferences: user.guestProfile?.preferences ?? '' };
  }

  async updateCustomerProfile(userId: string, email: string, fullName: string, phone: string, preferences?: string) {
    const name = fullName.trim();
    if (!name) throw new BadRequestException('Full name is required.');
    const guest = await this.db.guest.upsert({
      where: { accountId: userId },
      create: { accountId: userId, email, name, phone: phone.trim() || null, ...(preferences !== undefined ? { preferences: preferences.trim() } : {}) },
      update: { name, phone: phone.trim() || null, ...(preferences !== undefined ? { preferences: preferences.trim() } : {}) },
    });
    return { id: userId, email, fullName: guest.name, phone: guest.phone ?? '', preferences: guest.preferences ?? '' };
  }

  private readonly staffSelect = { id: true, email: true, fullName: true, role: true, isActive: true, pendingActivation: true, createdAt: true } as const;

  async staffProfile(id: string) {
    const user = await this.db.user.findUnique({ where: { id }, select: this.staffSelect });
    if (!user?.isActive || user.pendingActivation || user.role === 'CUSTOMER') throw new UnauthorizedException('Account disabled.');
    return user;
  }

  async staffForgotPassword(email: string, ip: string, locale: 'en' | 'vi' = 'en') {
    const normalized = email.trim().toLowerCase();
    const config = resetEmailConfig('staff-password-reset');
    limitResetRequest('staff-request-ip', ip, 30, 15 * 60_000);
    const response = { message: 'If an eligible account exists, a reset link will be sent.' };
    if (!limitResetRequest('staff-request-email', normalized, 1, 60_000, true)) return response;
    const user = await this.db.user.findUnique({ where: { email: normalized } });
    if (user?.isActive && !user.pendingActivation && user.role !== 'CUSTOMER') {
      await sendResetEmail(config, normalized, issueResetToken(user.id, user.passwordHash, secret(), 'staff-password-reset'), locale, 'staff-password-reset');
    }
    return response;
  }

  private async staffTokenAccount(token: string, activation: boolean) {
    const purpose = activation ? 'staff-activation' : 'staff-password-reset';
    const invalid = () => new BadRequestException('Reset link is invalid or expired.');
    const claims = readResetToken(token, purpose);
    if (!claims) throw invalid();
    const user = await this.db.user.findUnique({ where: { id: claims.sub } });
    if (!user || user.role === 'CUSTOMER' || user.pendingActivation !== activation || user.isActive === activation || !verifyResetToken(token, user.passwordHash, secret(), purpose)) throw invalid();
    return user;
  }

  async inspectStaffToken(token: string, activation: boolean, ip: string) {
    limitResetRequest('staff-inspect-ip', ip, 60, 15 * 60_000);
    const user = await this.staffTokenAccount(token, activation);
    return { email: user.email, role: user.role, fullName: user.fullName };
  }

  async completeStaffPassword(token: string, password: string, ip: string, activation = false) {
    limitResetRequest('staff-confirm-ip', ip, 30, 15 * 60_000);
    const user = await this.staffTokenAccount(token, activation);
    await this.db.$transaction(async tx => {
      const changed = await tx.user.updateMany({ where: { id: user.id, passwordHash: user.passwordHash, role: user.role, isActive: !activation, pendingActivation: activation }, data: { passwordHash: passwordHash(password), pendingActivation: false, isActive: true, staffSessionVersion: { increment: 1 } } });
      if (changed.count !== 1) throw new BadRequestException('Reset link is invalid or expired.');
      await tx.auditLog.create({ data: { actorId: user.id, operation: activation ? 'ACTIVATE_STAFF' : 'RESET_STAFF_PASSWORD', entity: 'User', entityId: user.id, detail: {} } });
    });
    return { message: activation ? 'Account activated. Please sign in.' : 'Password updated. Please sign in.' };
  }

  async changeStaffPassword(id: string, current: string, password: string) {
    limitResetRequest('staff-change-password', id, 10, 15 * 60_000);
    const user = await this.db.user.findUnique({ where: { id } });
    if (!user?.isActive || user.pendingActivation || user.role === 'CUSTOMER' || !passwordMatches(current, user.passwordHash)) throw new BadRequestException('Current password is incorrect.');
    if (current === password) throw new BadRequestException('New password must be different.');
    await this.db.$transaction(async tx => {
      const changed = await tx.user.updateMany({ where: { id, passwordHash: user.passwordHash, isActive: true, role: user.role }, data: { passwordHash: passwordHash(password), staffSessionVersion: { increment: 1 } } });
      if (changed.count !== 1) throw new UnauthorizedException('Expired or invalid access token.');
      await tx.auditLog.create({ data: { actorId: id, operation: 'CHANGE_STAFF_PASSWORD', entity: 'User', entityId: id, detail: {} } });
    });
    return { message: 'Password updated. Please sign in.' };
  }

  async logoutStaff(id: string) {
    await this.db.user.updateMany({ where: { id, role: { not: 'CUSTOMER' } }, data: { staffSessionVersion: { increment: 1 } } });
    return { message: 'Signed out successfully.' };
  }

  private assertStaffPermission(actorRole: string, targetRole: string) {
    if (!['ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPING'].includes(targetRole) || (actorRole !== 'ADMIN' && !(actorRole === 'MANAGER' && ['RECEPTIONIST', 'HOUSEKEEPING'].includes(targetRole)))) throw new ForbiddenException('Insufficient role permissions.');
  }

  listStaff(actorRole: string) {
    if (!['ADMIN', 'MANAGER'].includes(actorRole)) throw new ForbiddenException('Insufficient role permissions.');
    const roles = actorRole === 'ADMIN' ? ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPING'] as const : ['RECEPTIONIST', 'HOUSEKEEPING'] as const;
    return this.db.user.findMany({ where: { role: { in: [...roles] } }, select: this.staffSelect, orderBy: { createdAt: 'desc' } });
  }

  async createStaff(dto: CreateEmployeeDto, actor: { id: string; role: string; }) {
    this.assertStaffPermission(actor.role, dto.role);
    const config = resetEmailConfig('staff-activation');
    limitResetRequest('staff-invite', actor.id, 20, 60 * 60_000);
    const email = dto.email.trim().toLowerCase();
    if (await this.db.user.findUnique({ where: { email } })) throw new ConflictException('Email already registered.');
    const hash = passwordHash(randomBytes(32).toString('base64url'));
    const user = await this.db.$transaction(async tx => {
      const created = await tx.user.create({ data: { email, fullName: dto.fullName.trim(), passwordHash: hash, role: dto.role as 'ADMIN' | 'MANAGER' | 'RECEPTIONIST' | 'HOUSEKEEPING', isActive: false, pendingActivation: true }, select: this.staffSelect });
      await tx.auditLog.create({ data: { actorId: actor.id, operation: 'INVITE_STAFF', entity: 'User', entityId: created.id, detail: { role: created.role } } });
      return created;
    });
    const invitationSent = await sendResetEmail(config, email, issueResetToken(user.id, hash, secret(), 'staff-activation'), dto.locale ?? 'en', 'staff-activation');
    return { ...user, invitationSent, message: invitationSent ? 'Staff invitation sent successfully.' : 'Staff account created. Invitation delivery failed. Please resend.' };
  }

  async resendStaffInvitation(id: string, actor: { id: string; role: string; }, locale: 'en' | 'vi') {
    const config = resetEmailConfig('staff-activation');
    limitResetRequest('staff-resend', actor.id, 20, 60 * 60_000);
    const user = await this.db.user.findUnique({ where: { id } });
    if (!user?.pendingActivation || user.isActive) throw new BadRequestException('Staff invitation is not pending.');
    this.assertStaffPermission(actor.role, user.role);
    limitResetRequest('staff-resend-target', id, 1, 60_000);
    const hash = passwordHash(randomBytes(32).toString('base64url'));
    const result = await this.db.user.updateMany({ where: { id, role: user.role, passwordHash: user.passwordHash, pendingActivation: true, isActive: false }, data: { passwordHash: hash } });
    if (result.count !== 1) throw new BadRequestException('Staff invitation is not pending.');
    if (!await sendResetEmail(config, user.email, issueResetToken(id, hash, secret(), 'staff-activation'), locale, 'staff-activation')) throw new ServiceUnavailableException('Invitation delivery failed. Please resend.');
    return { message: 'Staff invitation sent successfully.' };
  }

  async setActive(userId: string, isActive: boolean, actor: { id: string; role: string; }) {
    if (userId === actor.id) throw new BadRequestException('Cannot disable your own account.');
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user || user.role === 'CUSTOMER') throw new BadRequestException('Staff account not found.');
    this.assertStaffPermission(actor.role, user.role);
    if (user.pendingActivation) throw new BadRequestException('Staff invitation is pending.');
    return this.db.$transaction(async tx => {
      const updated = await tx.user.updateMany({ where: { id: userId, role: user.role, pendingActivation: false }, data: { isActive, staffSessionVersion: { increment: 1 } } });
      if (updated.count !== 1) throw new ConflictException('Staff account changed. Please reload.');
      await tx.auditLog.create({ data: { actorId: actor.id, operation: 'SET_STAFF_ACTIVE', entity: 'User', entityId: userId, detail: { isActive } } });
      return tx.user.findUniqueOrThrow({ where: { id: userId }, select: this.staffSelect });
    });
  }

  async changeRole(userId: string, dto: UpdateRoleDto, actor: { id: string; role: string; }) {
    if (userId === actor.id) throw new BadRequestException('You cannot change your own role.');
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user || user.role === 'CUSTOMER') throw new BadRequestException('Staff account not found.');
    this.assertStaffPermission(actor.role, user.role);
    this.assertStaffPermission(actor.role, dto.role);
    return this.db.$transaction(async tx => {
      const updated = await tx.user.updateMany({ where: { id: userId, role: user.role }, data: { role: dto.role as 'ADMIN' | 'MANAGER' | 'RECEPTIONIST' | 'HOUSEKEEPING', staffSessionVersion: { increment: 1 } } });
      if (updated.count !== 1) throw new ConflictException('Staff account changed. Please reload.');
      await tx.auditLog.create({ data: { actorId: actor.id, operation: 'CHANGE_STAFF_ROLE', entity: 'User', entityId: userId, detail: { previousRole: user.role, newRole: dto.role } } });
      return tx.user.findUniqueOrThrow({ where: { id: userId }, select: this.staffSelect });
    });
  }
}
