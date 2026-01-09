import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  Ip,
  Headers,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto';
import * as decorators from './decorators';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @decorators.Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const result = await this.authService.register(dto, ip, userAgent);

    this.setAuthCookies(res, result.accessToken, result.refreshToken);

    return {
      user: result.user,
      org: result.org,
    };
  }

  @decorators.Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const result = await this.authService.login(dto, ip, userAgent);

    this.setAuthCookies(res, result.accessToken, result.refreshToken);

    return {
      user: result.user,
      org: result.org,
      role: result.role,
    };
  }

  @decorators.Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const refreshToken = req.cookies?.['refresh_token'];
    const result = await this.authService.refresh(refreshToken, ip, userAgent);

    this.setAuthCookies(res, result.accessToken, result.refreshToken);

    return { message: 'Token refreshed successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @decorators.CurrentUser() user: decorators.JwtPayload,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    await this.authService.logout(
      user.sessionId,
      user.sub,
      user.orgId,
      ip,
      userAgent,
    );

    this.clearAuthCookies(res);

    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@decorators.CurrentUser() user: decorators.JwtPayload) {
    return this.authService.getMe(user.sub, user.orgId);
  }

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    const isProduction = process.env.NODE_ENV === 'production';
    const secure = isProduction;
    const domain = process.env.COOKIE_DOMAIN;

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
      domain,
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      domain,
    });
  }

  private clearAuthCookies(res: Response) {
    const domain = process.env.COOKIE_DOMAIN;

    res.clearCookie('access_token', { domain });
    res.clearCookie('refresh_token', { domain });
  }
}
