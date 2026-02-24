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
    @Query('view') view?: string,
    @Query('includeProgress') includeProgress?: string, // tambah
  ) {
    if (station) {
      if (view === 'history') {
        return this.productionOrdersService.findHistoryForStation(station);
      }
      // Ubah pemanggilan method dengan parameter includeProgress
      return this.productionOrdersService.findActiveForStation(station, includeProgress === 'true');
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

  // =========================================================
  // 5. CHECK PANEL INSPECTIONS ENDPOINT (ADDED)
  // =========================================================
  @Get(':id/check-panel-inspections')
  async getCheckPanelInspections(@Param('id') id: string) {
    return this.productionOrdersService.getCheckPanelInspections(id);
  }

  // =========================================================
  // 6. SEWING PROGRESS ENDPOINT (ADDED)
  // =========================================================
  @Get(':id/sewing-progress')
  async getSewingProgress(@Param('id') id: string) {
    return this.productionOrdersService.getSewingProgress(id);
  }

  // =========================================================
  // 7. QC INSPECTION ENDPOINTS (ADDED)
  // =========================================================
  @Post(':id/qc-inspect')
  async qcInspect(
    @Param('id') id: string,
    @Body() body: { good: number; ng: number; ngReasons?: string[] }
  ) {
    return this.productionOrdersService.qcInspect(id, body);
  }

  @Get(':id/qc-inspections')
  async getQcInspections(@Param('id') id: string) {
    return this.productionOrdersService.getQcInspections(id);
  }
}