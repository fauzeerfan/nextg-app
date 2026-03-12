import { Controller, Post, Body, UseGuards, Get, Param, Delete } from '@nestjs/common';
import { PackingService } from './packing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('packing')
export class PackingController {
  constructor(private readonly service: PackingService) {}

  @Post('session')
  @UseGuards(JwtAuthGuard)
  async createSession(@Body() body: { fgNumber: string }) {
    return this.service.createSession(body.fgNumber);
  }

  @Post('add')
  @UseGuards(JwtAuthGuard)
  async addItem(@Body() body: { sessionId: string; opId: string; qty: number }) {
    return this.service.addItem(body.sessionId, body.opId, body.qty);
  }

  @Post('close')
  @UseGuards(JwtAuthGuard)
  async closeSession(@Body() body: { sessionId: string }) {
    return this.service.closeSession(body.sessionId);
  }

  @Get('sessions/active')
  async getActiveSession() {
    return this.service.getActiveSession();
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  async getHistory() {
    return this.service.getHistory();
  }

  @Post('reprint/:sessionId')
  @UseGuards(JwtAuthGuard)
  async reprint(@Param('sessionId') sessionId: string) {
    return this.service.reprint(sessionId);
  }

  @Delete('session/:sessionId')
  @UseGuards(JwtAuthGuard)
  async cancelSession(@Param('sessionId') sessionId: string) {
    return this.service.cancelSession(sessionId);
  }

  // ========== NEW ENDPOINT: packed-boxes ==========
  @Get('packed-boxes')
  @UseGuards(JwtAuthGuard)
  async getPackedBoxes() {
    return this.service.getPackedBoxes();
  }
}