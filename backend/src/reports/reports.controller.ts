import {
  Controller,
  Get,
  Query,
  UseGuards,
  Res,
  Header,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Response } from 'express';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // ========== NEW: Running OPs ==========
  @Get('running-ops')
  async getRunningOps() {
    return this.reportsService.getRunningOps();
  }

  // ========== NG CUTTING POND & CHECK PANEL (GABUNGAN) ==========
  @Get('ng-cutting-pond-checkpanel')
  async getNgCuttingPondCheckPanel(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('lineCode') lineCode?: string,
    @Query('opId') opId?: string,
  ) {
    return this.reportsService.getNgCuttingPondCheckPanel({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      lineCode,
      opId,
    });
  }

  // ========== NG QUALITY CONTROL (dengan filter OP) ==========
  @Get('ng-quality-control')
  async getNgQualityControl(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('lineCode') lineCode?: string,
    @Query('opId') opId?: string,
  ) {
    return this.reportsService.getNgQualityControlReport({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      lineCode,
      opId,
    });
  }

  // ========== LINE CHECK TIME (BARU) ==========
  @Get('line-check-time')
  async getLineCheckTime(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('lineCode') lineCode?: string,
    @Query('station') station?: string,
  ) {
    return this.reportsService.getLineCheckTime({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      lineCode,
      station,
    });
  }

  // ========== STATION PERFORMANCE (dengan filter station) ==========
  @Get('station-performance')
  async getStationPerformance(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('lineCode') lineCode?: string,
    @Query('station') station?: string,
  ) {
    return this.reportsService.getStationPerformanceReport({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      lineCode,
      station,
    });
  }

  // ========== LINE PERFORMANCE (dengan filter line) ==========
  @Get('line-performance')
  async getLinePerformance(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('lineCode') lineCode?: string,
  ) {
    return this.reportsService.getLinePerformanceReport({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      lineCode,
    });
  }

  // ========== DAILY PRODUCTION (dengan groupBy) ==========
  @Get('daily-production')
  async getDailyProduction(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy?: 'line' | 'station',
  ) {
    return this.reportsService.getDailyProductionReport({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      groupBy,
    });
  }

  // ========== NEW: STATION PRODUCTION REPORT ==========
  @Get('station-production')
  async getStationProduction(
    @Query('station') station: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('lineCode') lineCode?: string,
    @Query('opNumber') opNumber?: string,
  ) {
    if (!station) {
      throw new Error('Station parameter is required');
    }
    return this.reportsService.getStationProductionReport({
      station,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      lineCode,
      opNumber,
    });
  }

  // ========== EXPORTS (tetap, disesuaikan) ==========
  @Get('export/ng-cutting-pond')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="ng-cutting-pond.csv"')
  async exportNgCuttingPond(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('lineCode') lineCode?: string,
    @Res() res?: Response,
  ) {
    const data = await this.reportsService.getNgCuttingPondReport({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      lineCode,
    });
    let csv = 'OP Number,Style Code,Item Number,Line Code,NG Qty,Timestamp,Note\n';
    data.raw.forEach((log: any) => {
      csv += `"${log.op.opNumber}","${log.op.styleCode}","${log.op.itemNumberFG}","${log.op.line?.code || ''}",${log.qty},"${new Date(log.createdAt).toISOString()}","${log.note || ''}"\n`;
    });
    if (res) res.send(csv);
    return csv;
  }

  @Get('export/ng-check-panel')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="ng-check-panel.csv"')
  async exportNgCheckPanel(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('lineCode') lineCode?: string,
    @Res() res?: Response,
  ) {
    const data = await this.reportsService.getNgCheckPanelReport({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      lineCode,
    });
    let csv = 'OP Number,Style Code,Pattern Name,Good,NG,NG Reasons,Timestamp\n';
    data.raw.forEach((insp: any) => {
      csv += `"${insp.op.opNumber}","${insp.op.styleCode}","${insp.patternName}",${insp.good},${insp.ng},"${(insp.ngReasons || []).join('; ')}","${new Date(insp.createdAt).toISOString()}"\n`;
    });
    if (res) res.send(csv);
    return csv;
  }

  @Get('export/ng-quality-control')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="ng-quality-control.csv"')
  async exportNgQualityControl(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('lineCode') lineCode?: string,
    @Res() res?: Response,
  ) {
    const data = await this.reportsService.getNgQualityControlReport({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      lineCode,
    });
    let csv = 'OP Number,Style Code,Good,NG,NG Reasons,Timestamp\n';
    data.raw.forEach((insp: any) => {
      csv += `"${insp.op.opNumber}","${insp.op.styleCode}",${insp.good},${insp.ng},"${(insp.ngReasons || []).join('; ')}","${new Date(insp.createdAt).toISOString()}"\n`;
    });
    if (res) res.send(csv);
    return csv;
  }
}