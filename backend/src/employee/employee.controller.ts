import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('employee')
@UseGuards(JwtAuthGuard)
export class EmployeeController {
  private readonly logger = new Logger(EmployeeController.name);
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  async create(@Body() dto: CreateEmployeeDto) {
    console.log('Received employee data:', dto); // <-- Tambahkan log ini
    try {
      return await this.employeeService.create(dto);
    } catch (error) {
      this.logger.error(`Create employee error: ${error.message}`);
      throw new HttpException(
        error.message || 'Failed to create employee',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get()
  findAll() {
    return this.employeeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeeService.findOne(id);
  }

  @Get('nik/:nik')
  findByNik(@Param('nik') nik: string) {
    return this.employeeService.findByNik(nik);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeeService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.employeeService.remove(id);
  }
}