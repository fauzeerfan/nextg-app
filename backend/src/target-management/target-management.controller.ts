import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { TargetManagementService } from './target-management.service';
import { CreateTargetDto } from './dto/create-target.dto';
import { UpdateTargetDto } from './dto/update-target.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('target-management')
@UseGuards(JwtAuthGuard)
export class TargetManagementController {
  constructor(private readonly service: TargetManagementService) {}

  @Post()
  create(@Body() dto: CreateTargetDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':lineCode/:date')
  findByLineAndDate(@Param('lineCode') lineCode: string, @Param('date') date: string) {
    return this.service.findByLineAndDate(lineCode, new Date(date));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTargetDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}