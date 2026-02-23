import { Controller, Get, Post, Body, Param, Delete, Query } from '@nestjs/common';
import { ProductionOrdersService } from './production-orders.service';

@Controller('production-orders')
export class ProductionOrdersController {
  constructor(private readonly productionOrdersService: ProductionOrdersService) {}

  // =========================================================
  // 1. ACTION ENDPOINTS
  // =========================================================

  @Post('sync')
  syncData() {
    return this.productionOrdersService.syncExternalData();
  }

  @Post('simulate')
  createSimulation(@Body() dto: any) {
    return this.productionOrdersService.createSimulation(dto);
  }

  @Delete('reset-all-data')
  resetData() {
    return this.productionOrdersService.resetSystemData();
  }

  // =========================================================
  // 2. CUTTING QUEUE ENDPOINTS (NEW)
  // =========================================================

  @Get('cutting-entan/queue')
  async getCuttingEntanQueue() {
    return this.productionOrdersService.findActiveForStation('CUTTING_ENTAN');
  }

  @Get('cutting-pond/queue')
  async getCuttingPondQueue() {
    return this.productionOrdersService.findActiveForStation('CUTTING_POND');
  }

  // =========================================================
  // 3. STATS & QUERY
  // =========================================================

  @Get('dashboard-stats')
  getDashboardStats() {
    return this.productionOrdersService.getDashboardStats();
  }

  @Get()
  findAll(
    @Query('station') station?: string,
    @Query('view') view?: string
  ) {
    if (station) {
      if (view === 'history') {
        return this.productionOrdersService.findHistoryForStation(station);
      }
      return this.productionOrdersService.findActiveForStation(station);
    }

    return this.productionOrdersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productionOrdersService.findOne(id);
  }

  // =========================================================
  // 4. PATTERN PROGRESS ENDPOINT (NEW)
  // =========================================================
  @Get(':id/pattern-progress')
  async getPatternProgress(@Param('id') id: string) {
    return this.productionOrdersService.getPatternProgress(id);
  }
}