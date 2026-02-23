import { Controller, Get, Post, Param } from '@nestjs/common';
import { CuttingEntanService } from './cutting-entan.service';

@Controller('cutting-entan')
export class CuttingEntanController {
  constructor(private readonly service: CuttingEntanService) {}

  @Get('ops')
  getOps() {
    return this.service.getReadyOps();
  }

  @Post('generate/:opNumber')
  generate(@Param('opNumber') opNumber: string) {
    return this.service.generateQR(opNumber);
  }

  @Get('reprint/:batchId')
  reprint(@Param('batchId') batchId: string) {
    return this.service.reprintQR(batchId);
  }

  @Get('history/:opNumber')
  getHistory(@Param('opNumber') opNumber: string) {
    return this.service.getBatchHistory(opNumber);
  }

  @Get('batches')
  getAllBatches() {
    return this.service.getAllBatches();
  }

  @Get('total-sent')
  getTotalSent() {
    return this.service.getTotalSent();
  }
}