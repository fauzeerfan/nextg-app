import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  // 1. Validasi User & Password
  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      // Include Role & Permissions agar bisa dibaca
      include: { role: { include: { permissions: true } } } 
    });

    if (user && await bcrypt.compare(pass, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  // 2. Logic Login
  async login(user: any) {
    // Mapping permission dari format DB (Array Object) ke format App (Array String)
    // Contoh: ['CUTTING', 'MR', 'QC']
    const permissionList = user.role.permissions.map(p => p.featureId);

    const payload = { 
      username: user.username, 
      sub: user.id, 
      role: user.role.name,
      permissions: permissionList 
    };
    
    return {
      access_token: this.jwtService.sign(payload),
      // DATA INI YANG DIBACA FRONTEND:
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role.name,
        permissions: permissionList, // <--- INI KUNCINYA (Tadi belum dikirim)
        avatarSeed: user.fullName
      }
    };
  }
}