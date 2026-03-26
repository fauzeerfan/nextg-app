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

  @Get('ng-cutting-pond')
  async getNgCuttingPond(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('lineCode') lineCode?: string,
  ) {
    return this.reportsService.getNgCuttingPondReport({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      lineCode,
    });
  }

  @Get('ng-check-panel')
  async getNgCheckPanel(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('lineCode') lineCode?: string,
  ) {
    return this.reportsService.getNgCheckPanelReport({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      lineCode,
    });
  }

  @Get('ng-quality-control')
  async getNgQualityControl(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('lineCode') lineCode?: string,
  ) {
    return this.reportsService.getNgQualityControlReport({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      lineCode,
    });
  }

  @Get('station-performance')
  async getStationPerformance(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('lineCode') lineCode?: string,
  ) {
    return this.reportsService.getStationPerformanceReport({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      lineCode,
    });
  }

  @Get('line-performance')
  async getLinePerformance(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getLinePerformanceReport({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('daily-production')
  async getDailyProduction(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getDailyProductionReport({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  // ✅ FIX: @Res() di akhir, semua @Query() optional
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

    if (res) {
      res.send(csv);
    }
    return csv;
  }

  @Get('export/ng-check-panel')
  @Header('Content-Type', 'text/csv')
  @Header(
    'Content-Disposition',
    'attachment; filename="ng-check-panel.csv"',
  )
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

    if (res) {
      res.send(csv);
    }
    return csv;
  }

  @Get('export/ng-quality-control')
  @Header('Content-Type', 'text/csv')
  @Header(
    'Content-Disposition',
    'attachment; filename="ng-quality-control.csv"',
  )
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

    if (res) {
      res.send(csv);
    }
    return csv;
  }
}