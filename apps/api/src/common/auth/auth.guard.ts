import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../../core/auth.service';

export const Roles = (...roles: string[]) => SetMetadata('permittedRoles', roles);

export type SessionUser = { id: string; email: string; role: string; isActive: boolean };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService, private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ path: string; headers: { authorization?: string }; user?: SessionUser }>();
    const path = req.path;
    const secured = path.startsWith('/api/v1/admin/') || path.startsWith('/api/v1/me/') ||
      path === '/api/v1/me' || this.reflector.getAllAndOverride<boolean>('requiresAuth', [context.getHandler(), context.getClass()]);
    if (!secured) {
      // Optional token for linking guest bookings to an authenticated customer.
      const header = req.headers.authorization;
      if (header?.startsWith('Bearer ')) req.user = await this.auth.verify(header.slice(7));
      return true;
    }
    const raw = req.headers.authorization;
    if (!raw?.startsWith('Bearer ')) throw new UnauthorizedException('Bearer access token required.');
    req.user = await this.auth.verify(raw.slice(7));
    const roles = this.reflector.getAllAndOverride<string[]>('permittedRoles', [context.getHandler(), context.getClass()]) ??
      (path.startsWith('/api/v1/admin/') ? ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPING'] : ['CUSTOMER', 'ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPING']);
    if (!roles.includes(req.user.role)) throw new ForbiddenException('Insufficient role permissions.');
    return true;
  }
}
export const RequiresAuth = () => SetMetadata('requiresAuth', true);
