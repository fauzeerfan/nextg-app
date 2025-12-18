import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { MaterialRequestsService } from './material-requests.service';

@Controller('material-requests')
export class MaterialRequestsController {
  constructor(private readonly service: MaterialRequestsService) {}

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