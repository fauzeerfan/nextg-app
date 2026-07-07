import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { CuttingReportService } from './cutting-report.service';

@Controller('cutting-report')
export class CuttingReportController {
  constructor(private readonly service: CuttingReportService) {}

  // Master OP dari API getlistop
  @Get('oplist/:group/:style')
  getOpList(@Param('group') group: string, @Param('style') style: string) {
    return this.service.getOpList(group, style);
  }

  // Resolusi info OP langsung dari nomor OP (auto-fill Create Task)
  @Get('op-info/:opNumber')
  resolveOpInfo(@Param('opNumber') opNumber: string) {
    return this.service.resolveOpInfo(opNumber);
  }

  // ===== Form / Sesi =====
  @Post('forms')
  createForm(@Body() dto: any) {
    return this.service.createForm(dto);
  }

  @Get('forms')
  listForms() {
    return this.service.listForms();
  }

  @Get('forms/:id')
  getForm(@Param('id') id: string) {
    return this.service.getForm(id);
  }

  @Delete('forms/:id')
  deleteForm(@Param('id') id: string) {
    return this.service.deleteForm(id);
  }

  // ===== OP dalam form =====
  @Post('forms/:id/ops')
  addOp(@Param('id') id: string, @Body() dto: any) {
    return this.service.addOp(id, dto);
  }

  // Tambah OP cukup dengan nomor OP (style & group otomatis)
  @Post('forms/:id/ops-by-number')
  addOpByNumber(@Param('id') id: string, @Body() dto: any) {
    return this.service.addOpByNumber(id, dto);
  }

  @Delete('ops/:opId')
  removeOp(@Param('opId') opId: string) {
    return this.service.removeOp(opId);
  }

  // FASE 5: kirim hasil cutting report ini ke produksi (induk OP) — legacy per-OP
  @Post('ops/:opId/post-to-production')
  postToProduction(@Param('opId') opId: string, @Body() dto: any) {
    return this.service.postToProduction(opId, dto);
  }

  // ===== Entan =====
  @Post('ops/:opId/entans')
  addEntan(@Param('opId') opId: string) {
    return this.service.addEntan(opId);
  }

  // #2: Info kirim-produksi per-entan (set tersedia, sudah dikirim, sisa, batchCode)
  @Get('entans/:entanId/post-info')
  getEntanPostInfo(@Param('entanId') entanId: string) {
    return this.service.getEntanPostInfo(entanId);
  }

  // #2: Kirim ke Produksi PER-ENTAN (1 entan = 1 batch). Body: { batchCode?, qty? }
  @Post('entans/:entanId/post-to-production')
  postEntanToProduction(
    @Param('entanId') entanId: string,
    @Body() dto: { batchCode?: string; qty?: number },
  ) {
    return this.service.postEntanToProduction(entanId, dto);
  }

  @Patch('entans/:entanId/approve')
  approveEntan(@Param('entanId') entanId: string) {
    return this.service.approveEntan(entanId);
  }

  // ===== Detail cutting =====
  @Post('entans/:entanId/details')
  saveDetail(@Param('entanId') entanId: string, @Body() dto: any) {
    return this.service.saveDetail(entanId, dto);
  }

  @Patch('details/:id')
  updateDetail(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateDetail(id, dto);
  }

  @Delete('details/:id')
  deleteDetail(@Param('id') id: string) {
    return this.service.deleteDetail(id);
  }

  // Copy / gandakan satu baris cutting
  @Post('details/:id/copy')
  copyDetail(@Param('id') id: string) {
    return this.service.copyDetail(id);
  }

  // ===== Turunan (NON-AUTOMOTIVE / NAT) =====
  // Daftar grup turunan + baris NAT + ringkasan sisa per lot untuk satu material
  @Get('materials/:materialId/turunan')
  listTurunan(@Param('materialId') materialId: string) {
    return this.service.listTurunan(materialId);
  }

  // Buat grup turunan baru pada material
  @Post('materials/:materialId/turunan')
  createTurunan(@Param('materialId') materialId: string) {
    return this.service.createTurunan(materialId);
  }

  // Hapus grup turunan (baris NAT di dalamnya ikut terhapus)
  @Delete('turunan/:turunanId')
  deleteTurunan(@Param('turunanId') turunanId: string) {
    return this.service.deleteTurunan(turunanId);
  }

  // Ringkasan sisa material per No Lot (dari potong AUT) sebagai bahan turunan
  @Get('materials/:materialId/sisa-by-lot')
  sisaByLot(@Param('materialId') materialId: string) {
    return this.service.getSisaByLot(materialId);
  }

  // ===== Review =====
  @Get('review')
  review(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('variant') variant?: string,
  ) {
    // Diubah sesuai instruksi: gunakan method baru reviewWithFilters
    return this.service.reviewWithFilters({ startDate, endDate, variant });
  }
}