import { Module } from '@nestjs/common';
import { StationLogsService } from './station-logs.service';
import { StationLogsController } from './station-logs.controller';

@Module({
  controllers: [StationLogsController],
  providers: [StationLogsService],
})
export class StationLogsModule {}
