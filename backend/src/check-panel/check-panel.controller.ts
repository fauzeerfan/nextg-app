import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { CheckPanelService } from './check-panel.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('check-panel')
export class CheckPanelController {
  constructor(private readonly service: CheckPanelService) {}

  @Post('inspect')
  @UseGuards(JwtAuthGuard)
  async inspect(@Body() body: {
    opId: string;
    patternIndex: number;
    patternName: string;
    good: number;
    ng: number;
    ngReasons?: string[];
  }) {
    return this.service.inspect(body);
  }

  @Post('send-to-sewing')
  @UseGuards(JwtAuthGuard)
  async sendToSewing(@Body() body: { opId: string; qty: number }) {
    return this.service.sendToSewing(body);
  }
}