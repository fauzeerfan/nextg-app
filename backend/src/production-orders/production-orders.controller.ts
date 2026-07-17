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

  @Get('dashboard-comprehensive')
  async getDashboardComprehensive(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('lineCode') lineCode?: string,
    @Query('type') type?: string,
  ) {
    return this.productionOrdersService.getDashboardComprehensive(startDate, endDate, lineCode, type);
  }

  // Daftar TYPE finished goods (dari deskripsi FG) untuk mengisi dropdown filter. Read-only.
  @Get('dashboard-fg-types')
  getDashboardFgTypes(@Query('lineCode') lineCode?: string) {
    return this.productionOrdersService.getDashboardFgTypes(lineCode);
  }

  // Analitik dashboard per-station. Rentang: today | 7d | 30d, ATAU custom (startDate & endDate). Read-only.
  @Get('dashboard-analytics')
  getDashboardAnalytics(
    @Query('range') range?: string,
    @Query('lineCode') lineCode?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('type') type?: string,
  ) {
    return this.productionOrdersService.getDashboardAnalytics(range, lineCode, startDate, endDate, type);
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

  // =========================================================
  // 3b. STATION HISTORY (per-hari per-OP) — READ ONLY
  // Didefinisikan SEBELUM ':id' agar tidak tertangkap route dinamis.
  // =========================================================
  @Get('history/cutting-pond')
  getCuttingPondHistory(@Query('days') days?: string) {
    return this.productionOrdersService.getCuttingPondHistory(days ? Number(days) : undefined);
  }

  @Get('history/check-panel')
  getCheckPanelHistory(@Query('days') days?: string) {
    return this.productionOrdersService.getCheckPanelHistory(days ? Number(days) : undefined);
  }

  @Get('history/sewing')
  getSewingHistory(@Query('days') days?: string) {
    return this.productionOrdersService.getSewingHistory(days ? Number(days) : undefined);
  }

  @Get('history/quality-control')
  getQualityControlHistory(@Query('days') days?: string) {
    return this.productionOrdersService.getQualityControlHistory(days ? Number(days) : undefined);
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