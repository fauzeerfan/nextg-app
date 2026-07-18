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

// BARU: tracing berdasarkan Dokumen BC PENGELUARAN (setelah surat jalan -> invoice -> BC keluar)
@Get('bc-pengeluaran/:noDok')
async traceByBcPengeluaran(@Param('noDok') noDok: string) {
  return this.service.traceByBcPengeluaran(noDok);
}

// BARU: tracing berdasarkan INVOICE (surat jalan -> invoice -> BC keluar), end-to-end
@Get('invoice/:invoice')
async traceByInvoice(@Param('invoice') invoice: string) {
  return this.service.traceByInvoice(invoice);
}

  @Get('surat-jalan-material/:suratJalan')
  async getSuratJalanMaterial(@Param('suratJalan') suratJalan: string) {
    return this.service.getSuratJalanMaterialDetails(suratJalan);
  }
}