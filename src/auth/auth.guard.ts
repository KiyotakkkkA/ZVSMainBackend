import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { ConfigService } from 'src/config/config.service';
import { DatabaseService } from 'src/database/database.service';

export type AuthenticatedUser = {
  sub: number;
  email: string;
  sid?: number;
  ver?: number;
};

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorizationHeader = request.headers.authorization;

    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer token is required');
    }

    const accessToken = authorizationHeader.replace('Bearer ', '').trim();

    try {
      const payload = this.jwtService.verify<AuthenticatedUser>(accessToken, {
        secret: this.configService.getJwtSecret(),
      });

      if (!payload.sid || !payload.ver) {
        throw new UnauthorizedException(
          'Access token is not bound to a session',
        );
      }

      const session = await this.databaseService.refreshToken.findFirst({
        where: {
          id: payload.sid,
          userId: payload.sub,
          revoked: false,
          expiresAt: {
            gt: new Date(),
          },
        },
        select: {
          id: true,
          updatedAt: true,
        },
      });

      if (!session || session.updatedAt.getTime() !== payload.ver) {
        throw new UnauthorizedException('Access token is no longer active');
      }

      request.user = payload;

      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
