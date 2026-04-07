import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeeService {
  private readonly logger = new Logger(EmployeeService.name);
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateEmployeeDto) {
    // Validasi field required
    if (!dto.nik || !dto.fullName) {
      throw new BadRequestException('NIK and Full Name are required');
    }
    try {
      const employee = await this.prisma.employee.create({ data: dto });
      this.logger.log(`Employee created: ${employee.nik} - ${employee.fullName}`);
      return employee;
    } catch (error) {
      this.logger.error(`Create employee failed: ${error.message}`);
      if (error.code === 'P2002') {
        throw new ConflictException(`NIK ${dto.nik} already exists`);
      }
      throw error;
    }
  }

  async findAll() {
    return this.prisma.employee.findMany({ orderBy: { fullName: 'asc' } });
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async findByNik(nik: string) {
    return this.prisma.employee.findUnique({ where: { nik } });
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    try {
      return await this.prisma.employee.update({ where: { id }, data: dto });
    } catch (error) {
      if (error.code === 'P2002') throw new ConflictException('NIK already exists');
      throw error;
    }
  }

  async remove(id: string) {
    return this.prisma.employee.delete({ where: { id } });
  }
}