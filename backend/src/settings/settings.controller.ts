import { Body, Controller, Get, Put } from '@nestjs/common';
import { SettingsService, CuttingSource } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get()
  getAll() {
    return this.service.getAll();
  }

  // Dibaca layar Cutting Entan untuk menampilkan status switch.
  @Get('cutting-source')
  async getCuttingSource() {
    return { source: await this.service.getCuttingSource() };
  }

  // Tombol switch di layar Cutting Entan memanggil endpoint ini.
  @Put('cutting-source')
  async setCuttingSource(@Body() body: { source: CuttingSource; updatedBy?: string }) {
    return this.service.setCuttingSource(body?.source, body?.updatedBy);
  }
}