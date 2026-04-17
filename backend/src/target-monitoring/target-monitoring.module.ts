import { Module } from '@nestjs/common';
import { TargetMonitoringService } from './target-monitoring.service';
import { TargetMonitoringController } from './target-monitoring.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TargetManagementModule } from '../target-management/target-management.module';

@Module({
  imports: [PrismaModule, TargetManagementModule],
  controllers: [TargetMonitoringController],
  providers: [TargetMonitoringService],
})
export class TargetMonitoringModule {}