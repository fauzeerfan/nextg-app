import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { PatternMastersService } from './pattern-masters.service';

@Controller('pattern-masters')
export class PatternMastersController {
  constructor(private readonly service: PatternMastersService) {}

  @Post()
  create(@Body() dto: any) { return this.service.create(dto); }

  @Get()
  findAll(@Query('style') style?: string) {
      if (style) return this.service.findByStyle(style);
      return this.service.findAll();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) { return this.service.update(id, dto); }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.service.remove(id); }
}