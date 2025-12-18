import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  // 1. CREATE ROLE + PERMISSIONS
  async create(createRoleDto: any) {
    return this.prisma.role.create({
      data: {
        name: createRoleDto.name,
        description: createRoleDto.description,
        permissions: {
          // Loop setiap permissionID dan masukkan ke tabel RolePermission
          create: createRoleDto.permissions.map((featId: string) => ({
            featureId: featId,
          })),
        },
      },
    });
  }

  // 2. READ ROLES (Flatten Permissions)
  async findAll() {
    const roles = await this.prisma.role.findMany({
      include: {
        permissions: true, // Ambil data relasi permission
        _count: {
          select: { users: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Transform data agar 'permissions' berisi array string sederhana ['CUTTING', 'MR']
    // Bukan array object [{featureId: 'CUTTING', ...}]
    return roles.map((role) => ({
      ...role,
      permissions: role.permissions.map((p) => p.featureId),
    }));
  }

  async findOne(id: string) {
    return this.prisma.role.findUnique({
      where: { id },
      include: { permissions: true },
    });
  }

  // 3. UPDATE ROLE (Transaction)
  async update(id: string, updateRoleDto: any) {
    // Gunakan transaksi agar aman: Hapus permission lama -> Simpan yang baru
    return this.prisma.$transaction(async (tx) => {
      // A. Update Info Dasar
      const role = await tx.role.update({
        where: { id },
        data: {
          name: updateRoleDto.name,
          description: updateRoleDto.description,
        },
      });

      // B. Update Permissions (Jika ada perubahan)
      if (updateRoleDto.permissions) {
        // 1. Hapus semua permission lama milik role ini
        await tx.rolePermission.deleteMany({ where: { roleId: id } });

        // 2. Masukkan permission baru
        if (updateRoleDto.permissions.length > 0) {
          await tx.rolePermission.createMany({
            data: updateRoleDto.permissions.map((featId: string) => ({
              roleId: id,
              featureId: featId,
            })),
          });
        }
      }

      return role;
    });
  }

  // 4. DELETE ROLE
  async remove(id: string) {
    // Hapus permission dulu (cascade manual jika perlu) lalu hapus role
    // Karena di schema.prisma biasanya onUpdate: Cascade, tapi deleteMany lebih aman
    return this.prisma.$transaction(async (tx) => {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        return tx.role.delete({ where: { id } });
    });
  }
}