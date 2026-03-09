import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from 'src/config/config.service';
import { DatabaseService } from 'src/database/database.service';

type JwtPayload = {
  sub: string;
  email: string;
  sid?: number;
  ver?: number;
};

export type AuthenticatedUser = {
  sub: string;
  email: string;
  sid: number;
  ver: number;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      algorithms: ['RS256'],
      secretOrKey: configService.getJwtPublicKey(),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload.sid || !payload.ver) {
      throw new UnauthorizedException('Access token is not bound to a session');
    }

    const session = await this.databaseService.refreshToken.findFirst({
      where: {
        id: payload.sid,
        userId: Number(payload.sub),
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

    return {
      sub: payload.sub,
      email: payload.email,
      sid: payload.sid,
      ver: payload.ver,
    };
  }
}
