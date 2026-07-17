import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CuttingReportService } from './cutting-report.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// Identitas pemanggil dari JWT (untuk cek lock & approval Cutting Report).
const actorOf = (req: any) => ({
  userId: req?.user?.userId,
  role: req?.user?.role,
  username: req?.user?.username,
});

@Controller('cutting-report')
export class CuttingReportController {
  constructor(private readonly service: CuttingReportService) {}

  // Master OP dari API getlistop
  @Get('oplist/:group/:style')
  getOpList(@Param('group') group: string, @Param('style') style: string) {
    return this.service.getOpList(group, style);
  }

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
  @UseGuards(JwtAuthGuard)
  getForm(@Param('id') id: string, @Req() req: any) {
    return this.service.getForm(id, actorOf(req));
  }

  @Delete('forms/:id')
  @UseGuards(JwtAuthGuard)
  deleteForm(@Param('id') id: string, @Req() req: any) {
    return this.service.deleteForm(id, actorOf(req));
  }

  // ===== Request edit/hapus + Approval (notifikasi) =====
  @Post('forms/:id/request-edit')
  @UseGuards(JwtAuthGuard)
  createEditRequest(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    return this.service.createEditRequest({ ...dto, formId: id }, actorOf(req));
  }

  @Get('requests')
  @UseGuards(JwtAuthGuard)
  listRequests(@Req() req: any) {
    return this.service.listRequests(actorOf(req));
  }

  @Post('requests/:reqId/review')
  @UseGuards(JwtAuthGuard)
  reviewRequest(@Param('reqId') reqId: string, @Body() body: { action: 'APPROVE' | 'REJECT' }, @Req() req: any) {
    return this.service.reviewRequest(reqId, body?.action === 'REJECT' ? 'REJECT' : 'APPROVE', actorOf(req));
  }

  // ===== OP dalam form =====
  @Post('forms/:id/ops')
  @UseGuards(JwtAuthGuard)
  addOp(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    return this.service.addOp(id, dto, actorOf(req));
  }

  @Post('forms/:id/ops-by-number')
  @UseGuards(JwtAuthGuard)
  addOpByNumber(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    return this.service.addOpByNumber(id, dto, actorOf(req));
  }

  @Delete('ops/:opId')
  @UseGuards(JwtAuthGuard)
  removeOp(@Param('opId') opId: string, @Req() req: any) {
    return this.service.removeOp(opId, actorOf(req));
  }

  @Post('ops/:opId/post-to-production')
  @UseGuards(JwtAuthGuard)
  postToProduction(@Param('opId') opId: string, @Body() dto: any, @Req() req: any) {
    return this.service.postToProduction(opId, dto, actorOf(req));
  }

  // ===== Entan =====
  @Post('ops/:opId/entans')
  @UseGuards(JwtAuthGuard)
  addEntan(@Param('opId') opId: string, @Req() req: any) {
    return this.service.addEntan(opId, actorOf(req));
  }

  @Get('entans/:entanId/post-info')
  getEntanPostInfo(@Param('entanId') entanId: string) {
    return this.service.getEntanPostInfo(entanId);
  }

  @Post('entans/:entanId/post-to-production')
  @UseGuards(JwtAuthGuard)
  postEntanToProduction(
    @Param('entanId') entanId: string,
    @Body() dto: { batchCode?: string; qty?: number },
    @Req() req: any,
  ) {
    return this.service.postEntanToProduction(entanId, dto, actorOf(req));
  }

  @Patch('entans/:entanId/approve')
  @UseGuards(JwtAuthGuard)
  approveEntan(@Param('entanId') entanId: string, @Req() req: any) {
    return this.service.approveEntan(entanId, actorOf(req));
  }

  // ===== Detail cutting =====
  @Post('entans/:entanId/details')
  @UseGuards(JwtAuthGuard)
  saveDetail(@Param('entanId') entanId: string, @Body() dto: any, @Req() req: any) {
    return this.service.saveDetail(entanId, dto, actorOf(req));
  }

  @Patch('details/:id')
  @UseGuards(JwtAuthGuard)
  updateDetail(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    return this.service.updateDetail(id, dto, actorOf(req));
  }

  @Delete('details/:id')
  @UseGuards(JwtAuthGuard)
  deleteDetail(@Param('id') id: string, @Req() req: any) {
    return this.service.deleteDetail(id, actorOf(req));
  }

  @Post('details/:id/copy')
  @UseGuards(JwtAuthGuard)
  copyDetail(@Param('id') id: string, @Req() req: any) {
    return this.service.copyDetail(id, actorOf(req));
  }

  // ===== Turunan (NON-AUTOMOTIVE / NAT) =====
  @Get('materials/:materialId/turunan')
  listTurunan(@Param('materialId') materialId: string) {
    return this.service.listTurunan(materialId);
  }

  @Post('materials/:materialId/turunan')
  @UseGuards(JwtAuthGuard)
  createTurunan(@Param('materialId') materialId: string, @Req() req: any) {
    return this.service.createTurunan(materialId, actorOf(req));
  }

  @Delete('turunan/:turunanId')
  @UseGuards(JwtAuthGuard)
  deleteTurunan(@Param('turunanId') turunanId: string, @Req() req: any) {
    return this.service.deleteTurunan(turunanId, actorOf(req));
  }

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
    return this.service.reviewWithFilters({ startDate, endDate, variant });
  }
}
