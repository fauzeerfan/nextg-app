import { Controller, Get, Post, Body, Param, Patch, Delete, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ProductionPlanningService, GanttItem, DailyPlanActual } from './production-planning.service';
import { CreatePlannedOrderDto } from './dto/create-planned-order.dto';
import { UpdatePlannedOrderDto } from './dto/update-planned-order.dto';
import { CapacityQueryDto } from './dto/capacity-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('production-planning')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductionPlanningController {
  constructor(private readonly service: ProductionPlanningService) {}

  @Post('demand')
  @Roles('ADMINISTRATOR', 'MANAGER')
  async createDemand(@Body() dto: CreatePlannedOrderDto) {
    return this.service.createPlannedOrder(dto);
  }

  @Get('demand')
  @Roles('ADMINISTRATOR', 'MANAGER')
  async getAllDemand() {
    return this.service.getAllPlannedOrders();
  }

  @Get('demand/:id')
  @Roles('ADMINISTRATOR', 'MANAGER')
  async getDemandById(@Param('id') id: string) {
    return this.service.getPlannedOrderById(id);
  }

  @Patch('demand/:id')
  @Roles('ADMINISTRATOR', 'MANAGER')
  async updateDemand(@Param('id') id: string, @Body() dto: UpdatePlannedOrderDto) {
    return this.service.updatePlannedOrder(id, dto);
  }

  @Delete('demand/:id')
  @Roles('ADMINISTRATOR', 'MANAGER')
  async deleteDemand(@Param('id') id: string) {
    return this.service.deletePlannedOrder(id);
  }

  @Get('export/csv')
  @Roles('ADMINISTRATOR', 'MANAGER')
  async exportToCsv(@Res() res: Response) {
    const csv = await this.service.exportPlannedOrdersToCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=production_plan.csv');
    res.send(csv);
  }

  @Get('capacity-load')
  @Roles('ADMINISTRATOR', 'MANAGER')
  async getCapacityLoad(@Query() query: CapacityQueryDto) {
    return this.service.getCapacityLoad(query);
  }

  @Get('gantt')
  @Roles('ADMINISTRATOR', 'MANAGER')
  async getGanttData(
    @Query('lineCode') lineCode?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<{ lines: any[]; items: GanttItem[] }> {
    return this.service.getGanttData(lineCode, startDate, endDate);
  }

  @Get('plan-vs-actual')
  @Roles('ADMINISTRATOR', 'MANAGER')
  async getPlanVsActual(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<{
    period: { start: string; end: string };
    otdRate: number;
    totalPlannedQty: number;
    totalActualQty: number;
    dailyData: DailyPlanActual[];
  }> {
    return this.service.getPlanVsActual(startDate, endDate);
  }
}