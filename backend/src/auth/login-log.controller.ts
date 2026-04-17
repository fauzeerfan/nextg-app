import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { LoginLogService } from './login-log.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';

@Controller('auth/login-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LoginLogController {
  constructor(private readonly loginLogService: LoginLogService) {}

  @Get()
  @Roles('ADMINISTRATOR', 'MANAGER')
  async getLogs(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('username') username?: string,
    @Query('role') role?: string,
    @Query('status') status?: 'SUCCESS' | 'FAILED',
    @Query('station') station?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.loginLogService.getLogs({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      username,
      role,
      status,
      station,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  @Get('stats')
  @Roles('ADMINISTRATOR', 'MANAGER')
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.loginLogService.getStats(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}