import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { TraceabilityExtendedService, TraceResult, BcTraceResult } from './traceability-extended.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('traceability-extended')
@UseGuards(JwtAuthGuard)
export class TraceabilityExtendedController {
  constructor(private readonly service: TraceabilityExtendedService) {}

  @Get('surat-jalan/:suratJalan')
  async traceBySuratJalan(@Param('suratJalan') suratJalan: string): Promise<TraceResult> {
    return this.service.traceBySuratJalanFull(suratJalan);
  }

  @Get('bc-document')
  async traceByBcDocument(
    @Query('nomorDokumen') nomorDokumen: string,
    @Query('nomorEr') nomorEr?: string,
  ): Promise<BcTraceResult> {
    return this.service.traceByBcDocument(nomorDokumen, nomorEr);
  }
}