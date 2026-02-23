import { Controller, Post, Body } from '@nestjs/common';
import { ProductionEngineService } from './production-engine.service';

@Controller('iot')
export class ProductionEngineController {
  constructor(private readonly engine: ProductionEngineService) {}

  //////////////////////////////////////////////////////
  // CUTTING POND (SPARSHA POND)
  //////////////////////////////////////////////////////
  @Post('cutting-pond')
  async cuttingPond(
    @Body() body: { opId: string; qty: number }
  ) {
    await this.engine.cuttingPond(body.opId, body.qty || 1);
    return { success: true };
  }

  //////////////////////////////////////////////////////
  // CHECK PANEL SCAN (DHRISTI CP)
  //////////////////////////////////////////////////////
  @Post('cp-scan')
  async cpScan(
    @Body() body: { qrCode: string; qty: number }
  ) {
    await this.engine.cpScan(body.qrCode, body.qty || 1);
    return { success: true };
  }

  //////////////////////////////////////////////////////
  // SEWING START (DHRISTI SEWING START)
  //////////////////////////////////////////////////////
@Post('sewing-start')
async sewingStart(@Body() body: { deviceId: string; opId: string; qty?: number }) {
  await this.engine.sewingStart(body.deviceId, body.opId, body.qty || 1);
  return { success: true };
}

  //////////////////////////////////////////////////////
  // SEWING FINISH (SPARSHA FINISH)
  //////////////////////////////////////////////////////
@Post('sewing-finish')
async sewingFinish(@Body() body: { deviceId: string; opId: string; qty?: number }) {
  await this.engine.sewingFinish(body.deviceId, body.opId, body.qty || 1);
  return { success: true };
}

  //////////////////////////////////////////////////////
  // QUALITY CONTROL
  //////////////////////////////////////////////////////
  @Post('qc')
  async qc(
    @Body() body: { opId: string; good: number; ng: number }
  ) {
    await this.engine.qcProcess(
      body.opId,
      body.good || 0,
      body.ng || 0
    );
    return { success: true };
  }

  //////////////////////////////////////////////////////
  // PACKING
  //////////////////////////////////////////////////////
  @Post('packing')
  async packing(
    @Body() body: { opId: string; qty: number }
  ) {
    await this.engine.packing(body.opId, body.qty || 1);
    return { success: true };
  }

  //////////////////////////////////////////////////////
  // FINISHED GOODS SCAN
  //////////////////////////////////////////////////////
  @Post('fg-scan')
  async fgScan(
    @Body() body: { qrCode: string; qty: number }
  ) {
    await this.engine.fgScan(body.qrCode, body.qty || 1);
    return { success: true };
  }
}
