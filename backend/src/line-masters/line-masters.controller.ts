import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { LineMastersService } from './line-masters.service';

@Controller('line-masters')
export class LineMastersController {
  constructor(private readonly lineMastersService: LineMastersService) {}

  @Post()
  create(@Body() dto: any) {
    return this.lineMastersService.createLineMaster(dto);
  }

  @Get()
  findAll(@Query('active') active?: string) {
    if (active === 'true') {
      return this.lineMastersService.getActiveLines();
    }
    return this.lineMastersService.findAll();
  }

  @Get(':code')
  findOne(@Param('code') code: string) {
    return this.lineMastersService.findOne(code);
  }

  @Get(':code/stats')
  getStats(@Param('code') code: string) {
    return this.lineMastersService.getLineStats(code);
  }

  @Get(':code/ng-categories')
  async getNgCategories(@Param('code') code: string) {
    return this.lineMastersService.getNgCategories(code);
  }

  // ========== ENDPOINT BARU UNTUK SEWING CONFIG ==========
  @Get(':code/sewing-config')
  async getSewingConfig(@Param('code') code: string) {
    return this.lineMastersService.getSewingConfig(code);
  }

  @Patch(':code/sewing-config')
  async updateSewingConfig(@Param('code') code: string, @Body() sewingConfig: any) {
    return this.lineMastersService.updateSewingConfig(code, sewingConfig);
  }
  // ========================================================

  @Patch(':code')
  update(@Param('code') code: string, @Body() dto: any) {
    return this.lineMastersService.updateLineMaster(code, dto);
  }

  @Delete(':code')
  remove(@Param('code') code: string) {
    return this.lineMastersService.deleteLineMaster(code);
  }
}