// backend/src/iot/iot.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { IotService } from './iot.service';
import { ProductionEngineService } from '../mes/production-engine.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('iot')
export class IotController {
  constructor(
    private readonly iot: IotService,
    private readonly productionEngine: ProductionEngineService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('register')
  register(@Body() body: any) {
    return this.iot.register(body.deviceId);
  }

  @Get('config')
  getConfig(@Query('deviceId') deviceId: string) {
    return this.iot.getConfig(deviceId);
  }

  @Get('devices')
  getAll() {
    return this.iot.getAllDevices();
  }

  @Post('update')
  update(@Body() body: any) {
    return this.iot.updateDevice(body.deviceId, body);
  }

  @Post('pond/button')
  async pondButton(@Body() body: { deviceId: string; button: 'YELLOW' | 'RED' | 'GREEN' }) {
    return this.productionEngine.handlePondButton(body.deviceId, body.button);
  }

  /**
   * Mendapatkan state tampilan LCD untuk Sparsha Pond
   * Dipanggil secara periodik oleh ESP32 untuk refresh otomatis
   */
  @Get('pond/state')
  async getPondState(@Query('deviceId') deviceId: string) {
    if (!deviceId) {
      throw new BadRequestException('deviceId is required');
    }
    return this.productionEngine.getPondDisplay(deviceId);
  }

  @Post('sewing/start')
  async sewingStart(@Body() body: { deviceId: string; opId: string }) {
    const device = await this.prisma.iotDevice.findUnique({
      where: { deviceId: body.deviceId },
    });
    if (!device) throw new NotFoundException('Device not found');
    return this.productionEngine.sewingStart(body.deviceId, body.opId, 1);
  }

  @Post('sewing/finish')
  async sewingFinish(@Body() body: { deviceId: string; opId: string }) {
    const device = await this.prisma.iotDevice.findUnique({
      where: { deviceId: body.deviceId },
    });
    if (!device) throw new NotFoundException('Device not found');
    return this.productionEngine.sewingFinish(body.deviceId, body.opId, 1);
  }

  @Post('scanner/scan')
  async scannerScan(@Body() body: { deviceId: string; qrCode: string; qty: number }) {
    const device = await this.prisma.iotDevice.findUnique({
      where: { deviceId: body.deviceId },
    });
    if (!device) throw new NotFoundException('Device not registered');

    if (device.station === 'CP') {
      return this.productionEngine.cpScan(body.qrCode, body.qty || 1);
    } else if (device.station === 'SEWING') {
      // 🔥 Panggil method baru untuk pengiriman parsial dari Check Panel ke Sewing
      return this.productionEngine.sendToSewingFromScan(body.qrCode, body.qty || 1);
    } else {
      throw new NotFoundException('Unsupported station for scanner');
    }
  }
}