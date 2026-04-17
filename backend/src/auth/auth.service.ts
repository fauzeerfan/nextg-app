import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(
    username: string,
    password: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<{ user: any; errorMessage?: string }> {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      // catat log gagal (user tidak ditemukan)
      await this.prisma.userLoginLog.create({
        data: {
          username,
          ipAddress,
          userAgent,
          status: 'FAILED',
          errorMessage: 'User not found',
        },
      });
      return { user: null, errorMessage: 'Username atau Password salah' };
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      await this.prisma.userLoginLog.create({
        data: {
          username,
          ipAddress,
          userAgent,
          status: 'FAILED',
          errorMessage: 'Wrong password',
          userId: user.id,
        },
      });
      return { user: null, errorMessage: 'Username atau Password salah' };
    }

    if (!user.isActive) {
      await this.prisma.userLoginLog.create({
        data: {
          username,
          ipAddress,
          userAgent,
          status: 'FAILED',
          errorMessage: 'Account inactive',
          userId: user.id,
        },
      });
      return { user: null, errorMessage: 'Akun tidak aktif' };
    }

    const { password: _, ...result } = user;
    return { user: result };
  }

  async login(user: any, ipAddress: string, userAgent: string) {
    // catat log sukses
    await this.prisma.userLoginLog.create({
      data: {
        userId: user.id,
        username: user.username,
        ipAddress,
        userAgent,
        status: 'SUCCESS',
        station: user.allowedStations?.[0] || null, // ambil station pertama jika ada
      },
    });

    const payload = {
      username: user.username,
      sub: user.id,
      role: user.role,
      allowedStations: user.allowedStations || [],
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        lineCode: user.lineCode,
        allowedStations: user.allowedStations || [],
        permissions: user.permissions || [],
        isActive: user.isActive,
      },
    };
  }
}