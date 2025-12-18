import { Controller, Post, Body, Get } from '@nestjs/common'; // FIX: Menambahkan 'Get' di sini
import { StationLogsService } from './station-logs.service';

@Controller('station-logs')
export class StationLogsController {
  constructor(private readonly stationLogsService: StationLogsService) {}

  // ==========================================
  // 1. CUTTING
  // ==========================================
  @Post('cutting')
  createCutting(@Body() dto: any) {
    return this.stationLogsService.createCuttingLog(dto);
  }

  // ==========================================
  // 2. CHECKPANEL (CP)
  // ==========================================
  @Post('cp-scan')
  scanCP(@Body() dto: { qrCode: string }) {
    return this.stationLogsService.scanInCP(dto.qrCode);
  }

  @Post('cp-result')
  submitResultCP(@Body() dto: any) {
    return this.stationLogsService.submitCpResult(dto);
  }

  // ==========================================
  // 3. SEWING
  // ==========================================
  @Post('sewing-scan')
  scanSewing(@Body() dto: { qrCode: string }) {
    return this.stationLogsService.scanInSewing(dto.qrCode);
  }

  @Post('sewing-start')
  startSewing(@Body() dto: any) {
    return this.stationLogsService.sewingStart(dto);
  }

  @Post('sewing-finish')
  finishSewing(@Body() dto: any) {
    return this.stationLogsService.sewingFinish(dto);
  }

  // ==========================================
  // 4. QUALITY CONTROL (QC)
  // ==========================================
  @Post('qc-scan')
  scanQC(@Body() dto: { qrCode: string }) {
    return this.stationLogsService.scanInQC(dto.qrCode);
  }

  @Post('qc-result')
  submitResultQC(@Body() dto: any) {
    return this.stationLogsService.submitQcResult(dto);
  }

  // Manual Finish QC Session
  @Post('qc-finish')
  qcFinish(@Body() dto: any) {
    return this.stationLogsService.qcFinish(dto);
  }

  // ==========================================
  // 5. PACKING
  // ==========================================
  @Post('packing-input')
  packingInput(@Body() dto: any) {
    return this.stationLogsService.packingInput(dto);
  }

  @Post('packing-finish')
  packingFinish(@Body() dto: any) {
    return this.stationLogsService.packingFinish(dto);
  }

  // ==========================================
  // 6. FINISHED GOODS (FG)
  // ==========================================
  @Post('fg-scan')
  scanFG(@Body() dto: { qrCode: string }) {
    return this.stationLogsService.scanInFG(dto.qrCode);
  }

  @Post('fg-submit')
  submitFG(@Body() dto: any) {
    return this.stationLogsService.submitFG(dto);
  }

  // NEW: Get Live Stock (Penyebab Error sebelumnya karena @Get belum diimport)
  @Get('fg-stocks')
  getFgStocks() {
      return this.stationLogsService.getFgStocks();
  }
}