// backend/src/ai/ai.controller.ts
import { Controller, Post, Body, UseGuards, Get, Param, Put, Delete } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('chat')
  async chat(@Body() body: { message: string; userId?: string }) {
    return this.aiService.processMessage(body.message, body.userId);
  }

  // ========== ENDPOINT BARU UNTUK MENU ==========
  @Get('menu')
  @UseGuards(JwtAuthGuard)
  async getMenu() {
    return this.aiService.getMenuTree();
  }

  // Admin endpoints (protected by JWT, you can add RolesGuard)
  @Get('intents')
  @UseGuards(JwtAuthGuard)
  async getIntents() {
    return this.aiService.getAllIntents();
  }

  @Post('intents')
  @UseGuards(JwtAuthGuard)
  async createIntent(@Body() body: any) {
    return this.aiService.createIntent(body);
  }

  @Put('intents/:id')
  @UseGuards(JwtAuthGuard)
  async updateIntent(@Param('id') id: string, @Body() body: any) {
    return this.aiService.updateIntent(id, body);
  }

  @Delete('intents/:id')
  @UseGuards(JwtAuthGuard)
  async deleteIntent(@Param('id') id: string) {
    return this.aiService.deleteIntent(id);
  }
}