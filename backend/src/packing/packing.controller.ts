import { Controller, Post, Body, UseGuards } from '@nestjs/common';
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
}