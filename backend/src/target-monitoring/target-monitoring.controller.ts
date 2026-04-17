import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TargetMonitoringService } from './target-monitoring.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('target-monitoring')
@UseGuards(JwtAuthGuard)
export class TargetMonitoringController {
  constructor(private readonly service: TargetMonitoringService) {}

  @Get()
  async getMonitoring(
    @Query('lineCode') lineCode: string,
    @Query('station') station: string,
    @Query('date') date: string
  ) {
    if (!lineCode || !station || !date) {
      throw new Error('lineCode, station, and date are required');
    }
    return this.service.getMonitoringData(lineCode, station, date);
  }
}