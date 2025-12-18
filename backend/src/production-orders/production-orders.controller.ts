import { Controller, Get, Param, Query, Post, Body, Delete } from '@nestjs/common';
import { ProductionOrdersService } from './production-orders.service';

@Controller('production-orders')
export class ProductionOrdersController {
  constructor(private readonly service: ProductionOrdersService) {}

  @Get('dashboard-stats')
  getDashboardStats() { return this.service.getDashboardStats(); }

  @Get()
  findAll(@Query('station') station: string, @Query('view') view?: string) {
    if (view === 'history') return this.service.findHistoryForStation(station);
    if (station) return this.service.findActiveForStation(station);
    return [];
  }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  // --- NEW ENDPOINTS ---
  
  @Post('simulate')
  createSimulation(@Body() dto: any) {
      return this.service.createSimulation(dto);
  }

  @Delete('reset-all-data')
  resetSystem() {
      return this.service.resetSystemData();
  }
}