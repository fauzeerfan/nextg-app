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

  // ===== FG Master: kunci "semua item FG harus full qty sebelum shipping" =====
  // Default: enabled (true) -> mempertahankan perilaku sekarang.
  @Get('fg-enforce-full-qty')
  async getFgEnforce() {
    const v = await this.service.get('FG_ENFORCE_FULL_QTY', 'true');
    return { enabled: v !== 'false' };
  }

  @Put('fg-enforce-full-qty')
  async setFgEnforce(@Body() body: { enabled: boolean; updatedBy?: string }) {
    await this.service.set('FG_ENFORCE_FULL_QTY', body?.enabled ? 'true' : 'false', body?.updatedBy);
    return { enabled: !!body?.enabled };
  }
}