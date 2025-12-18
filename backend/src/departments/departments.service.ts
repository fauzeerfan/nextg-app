import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  async create(createDepartmentDto: any) {
    // Upsert: Update jika kode sudah ada, Create jika belum
    return this.prisma.department.upsert({
      where: { code: createDepartmentDto.code },
      update: { name: createDepartmentDto.name },
      create: {
        code: createDepartmentDto.code,
        name: createDepartmentDto.name,
      },
    });
  }

  async findAll() {
    return this.prisma.department.findMany({
      orderBy: { code: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.department.findUnique({
      where: { id },
    });
  }

  async update(id: string, updateDepartmentDto: any) {
    return this.prisma.department.update({
      where: { id },
      data: updateDepartmentDto,
    });
  }

  async remove(id: string) {
    return this.prisma.department.delete({
      where: { id },
    });
  }
}