import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TargetMonitoringService } from './target-monitoring.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('target-monitoring')
@UseGuards(JwtAuthGuard)
export class TargetMonitoringController {
  constructor(private readonly service: TargetMonitoringService) {}

  @Get()
  async getMonitoring(@Query('lineCode') lineCode: string, @Query('date') date: string) {
    if (!lineCode || !date) {
      throw new Error('lineCode and date are required');
    }
    return this.service.getMonitoringData(lineCode, date);
  }
}