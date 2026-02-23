import { Controller, Get } from '@nestjs/common';

@Controller('mes')
export class MesController {

  // dummy endpoint supaya tidak error
  @Get('sync')
  sync() {
    return { status: 'MES OK' };
  }
}
