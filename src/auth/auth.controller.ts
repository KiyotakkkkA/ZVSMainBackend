import { Body, Controller, Get, Headers, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { UserLoginDto } from 'src/dto/auth/user-login.dto';
import { UserLogoutDto } from 'src/dto/auth/user-logout.dto';
import { UserRegisterDto } from 'src/dto/auth/user-register.dto';
import { AuthService } from './auth.service';

@Controller('auth')
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

  @Get('me')
  async me(@Headers('authorization') authorization?: string) {
    return this.authService.me(authorization);
  }

  @Post('logout')
  async logout(
    @Body() body: UserLogoutDto,
    @Headers('authorization') authorization?: string,
    @Req() request?: Request,
  ) {
    return this.authService.logout(
      body.refreshToken,
      authorization,
      request ? this.getClientContext(request) : undefined,
    );
  }

  private getClientContext(request: Request) {
    const userAgent = request.get('user-agent') ?? 'unknown';

    return {
      ip: request.ip ?? request.socket.remoteAddress ?? 'unknown',
      userAgent,
      device: this.resolveDevice(userAgent),
    };
  }

  private resolveDevice(userAgent: string): string {
    const ua = userAgent.toLowerCase();

    if (ua.includes('iphone') || ua.includes('android')) {
      return 'mobile';
    }

    if (ua.includes('ipad') || ua.includes('tablet')) {
      return 'tablet';
    }

    return 'desktop';
  }
}
