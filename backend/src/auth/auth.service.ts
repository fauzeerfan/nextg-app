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

    // --- GENERATE allowedMenus JIKA KOSONG ---
    let allowedMenus = (user.allowedMenus as string[]) || [];
    if (allowedMenus.length === 0) {
      const stationToMenu: Record<string, string> = {
        'CUTTING_ENTAN': 'cutting_entan',
        'CUTTING_POND': 'cutting_pond',
        'CP': 'cp',
        'SEWING': 'sewing',
        'QC': 'qc',
        'PACKING': 'packing',
        'FG': 'fg',
      };
      const stations = (user.allowedStations as string[]) || [];
      const menuSet = new Set<string>();
      menuSet.add('dashboard'); // semua user bisa lihat dashboard
      stations.forEach(station => {
        const menu = stationToMenu[station];
        if (menu) menuSet.add(menu);
      });
      // ADMINISTRATOR dapat semua menu (daftar lengkap sesuai aplikasi)
      if (user.role === 'ADMINISTRATOR') {
        const allMenus = [
          'dashboard',
          'cutting_entan',
          'cutting_pond',
          'cp',
          'sewing',
          'qc',
          'packing',
          'fg',
          'admin',
          'reports',
        ];
        allowedMenus = allMenus;
      } else {
        allowedMenus = Array.from(menuSet);
      }
    }

    const { password: _, ...result } = user;
    (result as any).allowedMenus = allowedMenus; // tempelkan ke user object
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
      allowedMenus: user.allowedMenus || [], // <-- kirim ke frontend
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
        allowedMenus: user.allowedMenus || [], // ✅ TAMBAHKAN BARIS INI
        permissions: user.permissions || [],
        isActive: user.isActive,
      },
    };
  }
}