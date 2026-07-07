import { Module } from '@nestjs/common';
import { ManpowerService } from './manpower.service';
import { ManpowerController } from './manpower.controller';
import { AttendanceSchedulerService } from '../attendance-scheduler.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ManpowerController],
  // AttendanceSchedulerService = scheduler harian 07:30 (auto check-in non-sewing).
  providers: [ManpowerService, AttendanceSchedulerService],
  exports: [ManpowerService], // dipakai IotModule untuk check-in/out absensi via Dhristi
})
export class ManpowerModule {}