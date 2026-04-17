import { Controller, Post, Body, UnauthorizedException, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() body, @Req() req: Request) {
    const ipAddress = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    const validationResult = await this.authService.validateUser(
      body.username,
      body.password,
      ipAddress,
      userAgent,
    );

    if (!validationResult.user) {
      // sudah dicatat di validateUser
      throw new UnauthorizedException(
        validationResult.errorMessage || 'Username atau Password salah',
      );
    }

    return this.authService.login(validationResult.user, ipAddress, userAgent);
  }
}