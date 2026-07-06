import { Module } from '@nestjs/common';
import { ManpowerService } from './manpower.service';
import { ManpowerController } from './manpower.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ManpowerController],
  providers: [ManpowerService],
  exports: [ManpowerService], // dipakai IotModule untuk check-in absensi via Dhristi
})
export class ManpowerModule {}