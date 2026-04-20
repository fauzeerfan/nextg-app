import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ReportsModule } from '../reports/reports.module';
import { ConfigModule } from '@nestjs/config'; // <-- tambah

@Module({
  imports: [PrismaModule, ReportsModule, ConfigModule.forRoot()], // <-- tambah ConfigModule
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}