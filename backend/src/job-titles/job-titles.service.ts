import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JobTitlesService {
  constructor(private prisma: PrismaService) {}

  async create(createJobTitleDto: any) {
    // Upsert: Update jika nama sudah ada
    return this.prisma.jobTitle.upsert({
      where: { name: createJobTitleDto.name },
      update: {},
      create: { name: createJobTitleDto.name },
    });
  }

  async findAll() {
    return this.prisma.jobTitle.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.jobTitle.findUnique({
      where: { id },
    });
  }

  async update(id: string, updateJobTitleDto: any) {
    return this.prisma.jobTitle.update({
      where: { id },
      data: updateJobTitleDto,
    });
  }

  async remove(id: string) {
    return this.prisma.jobTitle.delete({
      where: { id },
    });
  }
}