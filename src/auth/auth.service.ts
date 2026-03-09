import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';
import { createHash, randomUUID } from 'crypto';
import { AuthenticatedUser } from 'src/auth/auth.guard';
import { ConfigService } from 'src/config/config.service';
import { DatabaseService } from 'src/database/database.service';
import { UserLoginDto } from 'src/dto/auth/user-login.dto';
import { UserRegisterDto } from 'src/dto/auth/user-register.dto';
import { UsersService } from 'src/users/users.service';
import {
  resolveBrowser,
  resolveDeviceType,
  resolveOs,
} from 'src/utils/resolvers';

type AuthClientContext = {
  ip: string;
  userAgent: string;
  browser: string;
  os: string;
  deviceType: string;
  deviceId: string;
  device: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(data: UserRegisterDto, ctx: AuthClientContext) {
    if (data.password !== data.passwordConfirm) {
      throw new BadRequestException('Password confirmation does not match');
    }

    const existingUser = await this.usersService.findByEmail(data.email);
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const passwordHash = await hash(data.password, 10);
    const user = await this.usersService.createUser(data, passwordHash);

    return this.createSession(user.id, user.email, ctx);
  }

  async login(data: UserLoginDto, ctx: AuthClientContext) {
    const user = await this.usersService.findByEmail(data.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await compare(data.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.createSession(user.id, user.email, ctx);
  }

  async me(userPayload: AuthenticatedUser) {
    const user = await this.usersService.findById(Number(userPayload.sub));

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async logout(refreshToken: string, userPayload: AuthenticatedUser) {
    const refreshTokenHash = this.hashToken(refreshToken);

    const session = await this.databaseService.refreshToken.findFirst({
      where: {
        token: refreshTokenHash,
        userId: Number(userPayload.sub),
        revoked: false,
      },
    });

    if (!session) {
      throw new UnauthorizedException('Session not found or already revoked');
    }

    await this.databaseService.refreshToken.update({
      where: { id: session.id },
      data: { revoked: true },
    });

    return { success: true };
  }

  async refresh(refreshToken: string, ctx: AuthClientContext) {
    const refreshTokenHash = this.hashToken(refreshToken);

    const tokenRecord = await this.databaseService.refreshToken.findFirst({
      where: {
        token: refreshTokenHash,
        revoked: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // TODO: Надо как то по-другому идентифицировать устройство
    if (tokenRecord.device !== ctx.deviceId) {
      await this.databaseService.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { revoked: true },
      });

      throw new UnauthorizedException(
        'Refresh token is not valid for this device',
      );
    }

    const nextRefreshToken = randomUUID();
    const refreshTokenTtlDays = this.configService.getJwtRefreshTtlDays();
    const nextRefreshTokenExpiresAt = new Date(
      Date.now() + refreshTokenTtlDays * 24 * 60 * 60 * 1000,
    );

    await this.databaseService.refreshToken.update({
      where: { id: tokenRecord.id },
      data: {
        token: this.hashToken(nextRefreshToken),
        expiresAt: nextRefreshTokenExpiresAt,
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
        device: ctx.deviceId,
      },
    });

    const refreshedSession = await this.databaseService.refreshToken.findUnique(
      {
        where: { id: tokenRecord.id },
        select: {
          id: true,
          updatedAt: true,
        },
      },
    );

    if (!refreshedSession) {
      throw new UnauthorizedException('Session not found after refresh');
    }

    const accessToken = await this.jwtService.signAsync(
      {
        sub: tokenRecord.user.id,
        email: tokenRecord.user.email,
        sid: refreshedSession.id,
        ver: refreshedSession.updatedAt.getTime(),
      },
      { expiresIn: this.configService.getJwtAccessExpiresInSeconds() },
    );

    return {
      accessToken,
      refreshToken: nextRefreshToken,
      user: {
        id: tokenRecord.user.id,
        email: tokenRecord.user.email,
        role: tokenRecord.user.role,
        status: tokenRecord.user.status,
        createdAt: tokenRecord.user.createdAt,
        updatedAt: tokenRecord.user.updatedAt,
      },
      tokenType: 'Bearer',
      expiresIn: this.configService.getJwtAccessExpiresInSeconds(),
    };
  }

  async getSessions(userPayload: AuthenticatedUser): Promise<{
    currentSession: number | null;
    sessions: Array<{
      id: number;
      deviceId: string | null;
      deviceLabel: string;
      browser: string;
      os: string;
      deviceType: string;
      isCurrent: boolean;
      ipAddress: string | null;
      userAgent: string | null;
      device: string | null;
      createdAt: Date;
      updatedAt: Date;
      expiresAt: Date;
    }>;
  }> {
    const now = new Date();

    await this.databaseService.refreshToken.updateMany({
      where: {
        userId: Number(userPayload.sub),
        revoked: false,
        expiresAt: {
          lte: now,
        },
      },
      data: {
        revoked: true,
      },
    });

    const sessions = await this.databaseService.refreshToken.findMany({
      where: {
        userId: Number(userPayload.sub),
        revoked: false,
        expiresAt: {
          gt: now,
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        device: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true,
      },
    });

    return {
      currentSession: userPayload.sid,
      sessions: sessions.map((session) => {
        const sessionUserAgent: string | null = session.userAgent ?? null;
        const parsed = this.parseSessionMeta(sessionUserAgent);

        return {
          ...session,
          deviceId: session.device,
          deviceLabel: `${parsed.browser} on ${parsed.os} (${parsed.deviceType})`,
          browser: parsed.browser,
          os: parsed.os,
          deviceType: parsed.deviceType,
          isCurrent: session.id === userPayload.sid,
        };
      }),
    };
  }

  async revokeSession(
    sessionId: number,
    userPayload: AuthenticatedUser,
  ): Promise<{ success: true }> {
    const session = await this.databaseService.refreshToken.findFirst({
      where: {
        id: sessionId,
        userId: Number(userPayload.sub),
      },
    });

    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    await this.databaseService.refreshToken.update({
      where: { id: sessionId },
      data: { revoked: true },
    });

    return { success: true };
  }

  private async createSession(
    userId: number,
    email: string,
    ctx: AuthClientContext,
  ) {
    await this.databaseService.refreshToken.updateMany({
      where: {
        userId,
        revoked: false,
        device: ctx.deviceId,
      },
      data: {
        revoked: true,
      },
    });

    const refreshToken = randomUUID();
    const refreshTokenHash = this.hashToken(refreshToken);
    const refreshTokenTtlDays = this.configService.getJwtRefreshTtlDays();
    const refreshExpiresAt = new Date(
      Date.now() + refreshTokenTtlDays * 24 * 60 * 60 * 1000,
    );

    const tokenRecord = await this.databaseService.refreshToken.create({
      data: {
        token: refreshTokenHash,
        userId,
        expiresAt: refreshExpiresAt,
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
        device: ctx.deviceId,
      },
    });

    const accessToken = await this.jwtService.signAsync(
      {
        sub: String(userId),
        email,
        sid: tokenRecord.id,
        ver: tokenRecord.updatedAt.getTime(),
      },
      { expiresIn: this.configService.getJwtAccessExpiresInSeconds() },
    );

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.configService.getJwtAccessExpiresInSeconds(),
    };
  }

  private hashToken(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private parseSessionMeta(userAgent: string | null): {
    browser: string;
    os: string;
    deviceType: string;
  } {
    const ua = (userAgent ?? 'unknown').toLowerCase();

    const browser = resolveBrowser(ua);

    const os = resolveOs(ua);

    const deviceType = resolveDeviceType(ua);

    return { browser, os, deviceType };
  }
}
