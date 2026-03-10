import { Injectable } from '@nestjs/common';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

export type { AuthenticatedUser } from './jwt.strategy';

export type AuthenticatedRequest = Request & {
  user: import('./jwt.strategy').AuthenticatedUser;
};

@Injectable()
export class AuthGuard extends PassportAuthGuard('jwt') {}
