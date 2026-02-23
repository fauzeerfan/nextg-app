import { Controller, Get, Post, Body } from '@nestjs/common';
import { ProductionEngineService } from '../mes/production-engine.service';

@Controller('pond')
export class PondController {
  constructor(private engine: ProductionEngineService) {}

  @Get('queue')
  async getQueue() {
    return this.engine.getPondQueue();
  }

  @Post('input')
  async input(@Body() body: { opId: string; qty: number }) {
    return this.engine.cuttingPond(body.opId, body.qty || 1);
  }
}