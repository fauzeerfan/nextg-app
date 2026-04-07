import { Controller, Get, Post, Body, Query, UseGuards, HttpException, HttpStatus, Logger, Param } from '@nestjs/common';
import { ManpowerService } from './manpower.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('manpower')
@UseGuards(JwtAuthGuard)
export class ManpowerController {
  private readonly logger = new Logger(ManpowerController.name);
  constructor(private readonly manpowerService: ManpowerService) {}

  @Post('checkin')
  async checkIn(@Body() dto: CreateAttendanceDto) {
    this.logger.log(`Check-in request: ${JSON.stringify(dto)}`);
    try {
      return await this.manpowerService.checkIn(dto);
    } catch (error: any) {
      this.logger.error(`Check-in error: ${error.message}`);
      throw new HttpException(
        error.message || 'Internal server error',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('today')
  getToday() {
    return this.manpowerService.getTodayAttendance();
  }

  @Get('by-date')
  getByDate(@Query('date') date: string) {
    return this.manpowerService.getAttendanceByDate(new Date(date));
  }

  @Get('sankey')
  getSankey(@Query('start') start?: string, @Query('end') end?: string) {
    return this.manpowerService.getSankeyData(start, end);
  }

  @Get('employee-flow')
  async getEmployeeFlow(
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('lineCode') lineCode?: string,
    @Query('station') station?: string,
    @Query('nik') nik?: string,
  ) {
    return this.manpowerService.getEmployeeFlow(start, end, lineCode, station, nik);
  }

  @Get('employee-timeline/:nik')
  async getEmployeeTimeline(
    @Param('nik') nik: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return this.manpowerService.getEmployeeTimeline(nik, start, end);
  }

  @Get('employee-flow-detail')
  async getEmployeeFlowDetail(
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('lineCode') lineCode?: string,
    @Query('station') station?: string,
    @Query('nik') nik?: string,
  ) {
    return this.manpowerService.getEmployeeFlowDetail(start, end, lineCode, station, nik);
  }

  @Get('attendance-list')
  async getAttendanceList(
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('lineCode') lineCode?: string,
    @Query('station') station?: string,
    @Query('nik') nik?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.manpowerService.getAttendanceList(
      start,
      end,
      lineCode,
      station,
      nik,
      limit ? parseInt(limit) : 50,
      offset ? parseInt(offset) : 0,
    );
  }
}