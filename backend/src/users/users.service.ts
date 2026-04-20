import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // ===============================
  // CREATE USER (ADMIN)
  // ===============================
  async create(dto: any) {
    const hashedPassword = await bcrypt.hash(dto.password || '123456', 10);
    try {
      return await this.prisma.user.create({
        data: {
          username: dto.username,
          password: hashedPassword,
          fullName: dto.fullName,
          role: dto.role || 'OPERATOR',
          allowedStations: dto.allowedStations || [],
          allowedMenus: dto.allowedMenus || [], // <-- tambah
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Username already exists');
      }
      throw error;
    }
  }

  // ===============================
  // GET ALL USERS
  // ===============================
  async findAll() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  // ===============================
  // GET ONE USER
  // ===============================
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // ===============================
  // UPDATE USER
  // ===============================
  async update(id: string, dto: any) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User not found');

    const data: any = {
      username: dto.username ?? existing.username,
      fullName: dto.fullName ?? existing.fullName,
      role: dto.role ?? existing.role,
      allowedStations: dto.allowedStations ?? existing.allowedStations,
      allowedMenus: dto.allowedMenus ?? existing.allowedMenus, // <-- tambah
    };

    // 🔥 reset password optional
    if (dto.password && dto.password.trim() !== '') {
      data.password = await bcrypt.hash(dto.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  // ===============================
  // DELETE USER
  // ===============================
  async remove(id: string) {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}