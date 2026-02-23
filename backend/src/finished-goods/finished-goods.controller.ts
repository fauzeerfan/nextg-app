import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { FinishedGoodsService } from './finished-goods.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('finished-goods')
export class FinishedGoodsController {
  constructor(private readonly service: FinishedGoodsService) {}

  @Post('receive')
  @UseGuards(JwtAuthGuard)
  async receive(@Body() body: { qrCode: string }) {
    return this.service.receiveBox(body.qrCode);
  }

  @Post('ship')
  @UseGuards(JwtAuthGuard)
  async ship(@Body() body: { fgNumber: string; qty: number; suratJalan: string }) {
    return this.service.ship(body.fgNumber, body.qty, body.suratJalan);
  }

  @Get('stock')
  @UseGuards(JwtAuthGuard)
  async getStock() {
    return this.service.getStock();
  }
}