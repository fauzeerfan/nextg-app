import { Controller, Post, Body, Get, UseGuards, Param } from '@nestjs/common';
import { FinishedGoodsService } from './finished-goods.service';
import { ExternalShippingService } from './external-shipping.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('finished-goods')
export class FinishedGoodsController {
  constructor(
    private readonly service: FinishedGoodsService,
    private readonly externalShipping: ExternalShippingService,
  ) {}

  @Post('receive')
  @UseGuards(JwtAuthGuard)
  async receive(@Body() body: { qrCode: string }) {
    return this.service.receive(body.qrCode);
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

  @Get('shipments')
  @UseGuards(JwtAuthGuard)
  async getShipments() {
    return this.service.getShipments();
  }

  @Get('shipping-documents')
  @UseGuards(JwtAuthGuard)
  async getShippingDocuments() {
    return this.externalShipping.getDokumenSuratJalan();
  }

  @Get('shipping-document-items/:noSuratJalan')
  @UseGuards(JwtAuthGuard)
  async getShippingDocumentItems(@Param('noSuratJalan') noSuratJalan: string) {
    return this.externalShipping.getItemsSuratJalan(noSuratJalan);
  }
}