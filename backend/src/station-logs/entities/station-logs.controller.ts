import { Body, Controller, Get, Post } from '@nestjs/common';
import { ProductionEngineService } from '../../mes/production-engine.service';

@Controller('station-logs')
export class StationLogsController {
  constructor(private engine: ProductionEngineService) {}

  @Post('cutting-pond')
  cuttingPond(@Body() body: { opId: string; qty: number }) {
    return this.engine.cuttingPond(body.opId, body.qty);
  }

  @Get('pond-queue')
  getQueue() {
    return this.engine.getPondQueue();
  }
}