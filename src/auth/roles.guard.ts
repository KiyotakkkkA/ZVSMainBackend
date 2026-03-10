import { Role } from '@prisma/client';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AUTH_ERRORS, authError } from './auth.errors';
import type { AuthenticatedRequest } from './jwt.guard';
import { ROLES_KEY } from './roles.decorator';

const ROLE_PRIORITY: Record<Role, number> = {
  VIEWONLY: 1,
  USER: 2,
  ADMIN: 3,
  ROOT: 4,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException(authError(AUTH_ERRORS.INSUFFICIENT_ROLE));
    }

    const currentRolePriority = ROLE_PRIORITY[user.role];
    const hasRequiredRole = requiredRoles.some(
      (requiredRole) => currentRolePriority >= ROLE_PRIORITY[requiredRole],
    );

    if (!hasRequiredRole) {
      throw new ForbiddenException(authError(AUTH_ERRORS.INSUFFICIENT_ROLE));
    }

    return true;
  }
}
