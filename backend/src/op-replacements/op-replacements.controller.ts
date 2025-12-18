import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { OpReplacementsService } from './op-replacements.service';

@Controller('op-replacements')
export class OpReplacementsController {
  constructor(private readonly service: OpReplacementsService) {}

  @Post()
  create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  // NEW: Endpoint Approval
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
      return this.service.updateStatus(id, status);
  }
}