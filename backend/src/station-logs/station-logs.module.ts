import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductionEngineService } from '../mes/production-engine.service';
import { StationLogsController } from './entities/station-logs.controller';
import { IotModule } from '../iot/iot.module';

@Module({
  imports: [IotModule],
  controllers: [StationLogsController],
  providers: [PrismaService, ProductionEngineService],
})
export class StationLogsModule {}