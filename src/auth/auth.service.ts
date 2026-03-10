import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';
import { createHash, randomUUID } from 'crypto';
import { AUTH_ERRORS, authError } from 'src/auth/auth.errors';
import { AuthenticatedUser } from 'src/auth/jwt.guard';
import { ConfigService } from 'src/config/config.service';
import { DatabaseService } from 'src/database/database.service';
import { UserLoginDto } from 'src/dto/auth/user-login.dto';
import { UserRegisterDto } from 'src/dto/auth/user-register.dto';
import { MailService } from 'src/mail/mail.service';
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
    private readonly mailService: MailService,
  ) {}

  async register(data: UserRegisterDto) {
    if (data.password !== data.passwordConfirm) {
      throw new BadRequestException(
        authError(AUTH_ERRORS.PASSWORD_CONFIRM_MISMATCH),
      );
    }

    const existingUser = await this.usersService.findByEmail(data.email);
    if (existingUser) {
      throw new BadRequestException(authError(AUTH_ERRORS.USER_ALREADY_EXISTS));
    }

    const verificationToken = randomUUID();
    const passwordHash = await hash(data.password, 10);
    await this.usersService.createUser(data, passwordHash, verificationToken);

    return {
      verificationToken,
    };
  }

  async login(data: UserLoginDto, ctx: AuthClientContext) {
    const user = await this.usersService.findByEmail(data.email);
    if (!user) {
      throw new UnauthorizedException(
        authError(AUTH_ERRORS.INVALID_CREDENTIALS),
      );
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException(
        authError(AUTH_ERRORS.ACCOUNT_NOT_ACTIVE),
      );
    }

    const passwordValid = await compare(data.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException(
        authError(AUTH_ERRORS.INVALID_CREDENTIALS),
      );
    }

    return this.createSession(user.id, user.email, ctx);
  }

  async verifyEmail(email: string, code: string, token: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new BadRequestException(authError(AUTH_ERRORS.USER_NOT_FOUND));
    }

    if (user.verifiedAt) {
      throw new BadRequestException(
        authError(AUTH_ERRORS.USER_ALREADY_VERIFIED),
      );
    }

    const verificationCodeHash = user.verificationCode;

    if (
      user.verificationToken !== token ||
      typeof verificationCodeHash !== 'string'
    ) {
      throw new BadRequestException(
        authError(AUTH_ERRORS.INVALID_VERIFICATION_REQUEST),
      );
    }

    const verificationCodeValid = await compare(code, verificationCodeHash);
    if (!verificationCodeValid) {
      throw new BadRequestException(
        authError(AUTH_ERRORS.INVALID_VERIFICATION_CODE),
      );
    }

    await this.databaseService.user.update({
      where: { id: user.id },
      data: {
        verifiedAt: new Date(),
        verificationCode: null,
        verificationToken: null,
        status: 'ACTIVE',
      },
    });
  }

  async sendVerificationCode(email: string, token: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException(authError(AUTH_ERRORS.USER_NOT_FOUND));
    }

    if (user.verifiedAt) {
      throw new BadRequestException(
        authError(AUTH_ERRORS.USER_ALREADY_VERIFIED),
      );
    }

    if (user.verificationToken !== token) {
      throw new BadRequestException(
        authError(AUTH_ERRORS.INVALID_VERIFICATION_TOKEN),
      );
    }

    const verificationCode = this.createVerificationCode();

    await this.databaseService.user.update({
      where: { id: user.id },
      data: {
        verificationCode: await hash(verificationCode, 10),
      },
    });

    await this.mailService.sendVerificationCode(user.email, verificationCode);

    return { success: true };
  }

  async me(userPayload: AuthenticatedUser) {
    const user = await this.usersService.findById(Number(userPayload.sub));

    if (!user) {
      throw new UnauthorizedException(authError(AUTH_ERRORS.USER_NOT_FOUND));
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
      throw new UnauthorizedException(
        authError(AUTH_ERRORS.SESSION_NOT_FOUND_OR_REVOKED),
      );
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
      throw new UnauthorizedException(
        authError(AUTH_ERRORS.INVALID_REFRESH_TOKEN),
      );
    }

    // TODO: Надо как то по-другому идентифицировать устройство
    if (tokenRecord.device !== ctx.deviceId) {
      await this.databaseService.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { revoked: true },
      });

      throw new UnauthorizedException(
        authError(AUTH_ERRORS.REFRESH_TOKEN_DEVICE_MISMATCH),
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
      throw new UnauthorizedException(
        authError(AUTH_ERRORS.SESSION_NOT_FOUND_AFTER_REFRESH),
      );
    }

    const accessToken = await this.jwtService.signAsync(
      {
        sub: tokenRecord.user.id,
        email: tokenRecord.user.email,
        role: tokenRecord.user.role,
        verified: !!tokenRecord.user.verifiedAt,
        status: tokenRecord.user.status,
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
      throw new UnauthorizedException(authError(AUTH_ERRORS.SESSION_NOT_FOUND));
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

    const user = await this.usersService.findById(userId);

    const accessToken = await this.jwtService.signAsync(
      {
        sub: String(userId),
        email,
        role: user?.role ?? Role.USER,
        verified: !!user?.verifiedAt,
        status: user?.status ?? 'UNVERIFIED',
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

  private createVerificationCode(): string {
    return `${Math.floor(100000 + Math.random() * 900000)}`;
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
