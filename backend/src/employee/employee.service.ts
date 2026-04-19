import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger, ForbiddenException } from '@nestjs/common';
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
} catch (error: any) {
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
    } catch (error: any) {
      if (error.code === 'P2002') throw new ConflictException('NIK already exists');
      throw error;
    }
  }

  async remove(id: string) {
    return this.prisma.employee.delete({ where: { id } });
  }

  async mutateEmployee(
    id: string,
    dto: {
      lineCode: string;
      station: string;
      section: string;
      department: string;
      jobTitle: string;
      note?: string;
      mutatedBy?: string;
    }
  ) {
    const employee = await this.findOne(id);
    if (!employee) throw new NotFoundException('Employee not found');

    // Simpan snapshot data lama
    const oldData = {
      lineCode: employee.lineCode,
      station: employee.station,
      section: employee.section,
      department: employee.department,
      jobTitle: employee.jobTitle,
    };

    // Update employee
    const updated = await this.prisma.employee.update({
      where: { id },
      data: {
        lineCode: dto.lineCode,
        station: dto.station,
        section: dto.section,
        department: dto.department,
        jobTitle: dto.jobTitle,
      },
    });

    // Simpan history
    await this.prisma.employeeMutationHistory.create({
      data: {
        employeeId: employee.id,
        nik: employee.nik,
        fullName: employee.fullName,
        oldLineCode: oldData.lineCode,
        newLineCode: dto.lineCode,
        oldStation: oldData.station,
        newStation: dto.station,
        oldSection: oldData.section,
        newSection: dto.section,
        oldDepartment: oldData.department,
        newDepartment: dto.department,
        oldJobTitle: oldData.jobTitle,
        newJobTitle: dto.jobTitle,
        note: dto.note,
        mutatedBy: dto.mutatedBy,
      },
    });

    return updated;
  }

  async getMutationHistory(employeeId: string) {
    return this.prisma.employeeMutationHistory.findMany({
      where: { employeeId },
      orderBy: { mutationDate: 'desc' },
    });
  }
}