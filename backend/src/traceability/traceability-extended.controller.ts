import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { TraceabilityExtendedService } from './traceability-extended.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('traceability-extended')
@UseGuards(JwtAuthGuard)
export class TraceabilityExtendedController {
  constructor(private readonly service: TraceabilityExtendedService) {}

  @Get('op/:opNumber')
  async traceByOp(@Param('opNumber') opNumber: string) {
    return this.service.traceByOpNumberFull(opNumber);
  }

@Get('surat-jalan/:suratJalan')
async traceBySuratJalan(@Param('suratJalan') suratJalan: string) {
  // Gunakan method yang mengambil data material dari external API
  return this.service.getSuratJalanMaterialDetails(suratJalan);
}

@Get('bc-document')
async traceByBcDocument(
  @Query('nomorDokumen') nomorDokumen: string,
  @Query('nomorEl') nomorEl?: string,
) {
  return this.service.traceByBcDocument(nomorDokumen, nomorEl);
}

  @Get('surat-jalan-material/:suratJalan')
  async getSuratJalanMaterial(@Param('suratJalan') suratJalan: string) {
    return this.service.getSuratJalanMaterialDetails(suratJalan);
  }
}