import { CanActivate, ForbiddenException, Injectable } from '@nestjs/common';

/** Temporary safety boundary. Replace with real authentication and RBAC. */
@Injectable()
export class DevelopmentOnlyGuard implements CanActivate {
  canActivate(): boolean {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Admin database endpoints are disabled until authentication and RBAC are implemented.');
    }
    return true;
  }
}
