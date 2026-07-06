import { Module } from '@nestjs/common';
import { CuttingReportController } from './cutting-report.controller';
import { CuttingReportService } from './cutting-report.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CuttingReportController],
  providers: [CuttingReportService],
})
export class CuttingReportModule {}