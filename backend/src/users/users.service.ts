import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

// Mapping menu -> station
const MENU_TO_STATION: Record<string, string> = {
  cutting_entan: 'CUTTING_ENTAN',
  cutting_pond: 'CUTTING_POND',
  cp: 'CP',
  sewing: 'SEWING',
  qc: 'QC',
  packing: 'PACKING',
  fg: 'FG',
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // Fungsi helper untuk menghasilkan allowedStations dari allowedMenus
  private generateStationsFromMenus(menus: string[]): string[] {
    if (!menus || !Array.isArray(menus)) return [];
    const stations = new Set<string>();
    for (const menu of menus) {
      const station = MENU_TO_STATION[menu];
      if (station) stations.add(station);
    }
    return Array.from(stations);
  }

  // ===============================
  // CREATE USER (ADMIN)
  // ===============================
  async create(dto: any) {
    const hashedPassword = await bcrypt.hash(dto.password || '123456', 10);
    // Hitung allowedStations otomatis dari allowedMenus
    const allowedMenus = dto.allowedMenus || [];
    const allowedStations = this.generateStationsFromMenus(allowedMenus);

    try {
      return await this.prisma.user.create({
        data: {
          username: dto.username,
          password: hashedPassword,
          fullName: dto.fullName,
          role: dto.role || 'OPERATOR',
          allowedStations: allowedStations,
          allowedMenus: allowedMenus,
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

    // Hitung allowedStations otomatis dari allowedMenus jika ada perubahan
    let allowedMenus = dto.allowedMenus ?? existing.allowedMenus;
    let allowedStations = existing.allowedStations;

    if (dto.allowedMenus !== undefined) {
      allowedMenus = dto.allowedMenus;
      allowedStations = this.generateStationsFromMenus(allowedMenus);
    }

    const data: any = {
      username: dto.username ?? existing.username,
      fullName: dto.fullName ?? existing.fullName,
      role: dto.role ?? existing.role,
      allowedStations: allowedStations,
      allowedMenus: allowedMenus,
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