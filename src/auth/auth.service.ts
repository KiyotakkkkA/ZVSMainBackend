import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';
import { randomUUID } from 'crypto';
import { ConfigService } from 'src/config/config.service';
import { DatabaseService } from 'src/database/database.service';
import { UserLoginDto } from 'src/dto/auth/user-login.dto';
import { UserRegisterDto } from 'src/dto/auth/user-register.dto';
import { UsersService } from 'src/users/users.service';

type AuthClientContext = {
  ip: string;
  userAgent: string;
  device: string;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

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

    this.logger.log(
      `register userId=${user.id} email=${user.email} ip=${ctx.ip} device=${ctx.device}`,
    );

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

    this.logger.log(
      `login userId=${user.id} email=${user.email} ip=${ctx.ip} device=${ctx.device}`,
    );

    return this.createSession(user.id, user.email, ctx);
  }

  async me(authorizationHeader?: string) {
    const payload = this.getAccessPayload(authorizationHeader);
    const user = await this.usersService.findById(payload.sub);

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

  async logout(
    refreshToken: string,
    authorizationHeader?: string,
    ctx?: AuthClientContext,
  ) {
    const payload = this.getAccessPayload(authorizationHeader);

    const session = await this.databaseService.refreshToken.findFirst({
      where: {
        token: refreshToken,
        userId: payload.sub,
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

    if (ctx) {
      this.logger.log(
        `logout userId=${payload.sub} ip=${ctx.ip} device=${ctx.device}`,
      );
    }

    return { success: true };
  }

  private async createSession(
    userId: number,
    email: string,
    ctx: AuthClientContext,
  ) {
    const accessToken = await this.jwtService.signAsync(
      { sub: userId, email },
      { expiresIn: this.configService.getJwtAccessExpiresInSeconds() },
    );

    const refreshToken = randomUUID();
    const refreshTokenTtlDays = this.configService.getJwtRefreshTtlDays();
    const refreshExpiresAt = new Date(
      Date.now() + refreshTokenTtlDays * 24 * 60 * 60 * 1000,
    );

    await this.databaseService.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt: refreshExpiresAt,
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
        device: ctx.device,
      },
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.configService.getJwtAccessExpiresInSeconds(),
    };
  }

  private getAccessPayload(authorizationHeader?: string) {
    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer token is required');
    }

    const accessToken = authorizationHeader.replace('Bearer ', '').trim();

    try {
      return this.jwtService.verify<{ sub: number; email: string }>(
        accessToken,
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
