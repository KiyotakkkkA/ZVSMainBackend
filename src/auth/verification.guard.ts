import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AUTH_ERRORS, authError } from './auth.errors';
import type { AuthenticatedRequest } from './jwt.guard';

@Injectable()
export class VerificationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (user && user.status !== 'ACTIVE') {
      throw new ForbiddenException(authError(AUTH_ERRORS.ACCOUNT_NOT_ACTIVE));
    }

    return true;
  }
}
