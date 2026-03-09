import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { UserLoginDto } from 'src/dto/auth/user-login.dto';
import { UserLogoutDto } from 'src/dto/auth/user-logout.dto';
import { UserRegisterDto } from 'src/dto/auth/user-register.dto';
import { AuthGuard } from './auth.guard';
import type { AuthenticatedRequest } from './auth.guard';
import { AuthService } from './auth.service';
import {
  resolveOs,
  resolveBrowser,
  resolveDeviceType,
} from 'src/utils/resolvers';

@Controller('auth')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() userRegisterDto: UserRegisterDto,
    @Req() request: Request,
  ) {
    return this.authService.register(
      userRegisterDto,
      this.getClientContext(request),
    );
  }

  @Post('login')
  async login(@Body() userLoginDto: UserLoginDto, @Req() request: Request) {
    return this.authService.login(userLoginDto, this.getClientContext(request));
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async me(@Req() request: AuthenticatedRequest) {
    return this.authService.me(request.user);
  }

  @UseGuards(AuthGuard)
  @Post('logout')
  async logout(
    @Body() body: UserLogoutDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.authService.logout(body.refreshToken, request.user);
  }

  @Post('refresh')
  async refresh(@Body() body: UserLogoutDto, @Req() request: Request) {
    return this.authService.refresh(
      body.refreshToken,
      this.getClientContext(request),
    );
  }

  @UseGuards(AuthGuard)
  @Get('sessions')
  async sessions(@Req() request: AuthenticatedRequest) {
    return await this.authService.getSessions(request.user);
  }

  @UseGuards(AuthGuard)
  @Delete('sessions/:id')
  async revokeSession(
    @Param('id', ParseIntPipe) sessionId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return await this.authService.revokeSession(sessionId, request.user);
  }

  private getClientContext(request: Request) {
    const userAgent = request.get('user-agent') ?? 'unknown';
    const browser = resolveBrowser(userAgent);
    const os = resolveOs(userAgent);
    const deviceType = resolveDeviceType(userAgent);
    const explicitDeviceId = request.get('x-device-id')?.trim();

    return {
      ip:
        request.ip ??
        request.get('x-real-ip')?.trim() ??
        request.socket.remoteAddress ??
        'unknown',
      userAgent,
      browser,
      os,
      deviceType,
      deviceId:
        explicitDeviceId && explicitDeviceId.length > 0
          ? explicitDeviceId
          : `${deviceType}:${os}:${browser}`,
      device: `${browser} on ${os} (${deviceType})`,
    };
  }
}
