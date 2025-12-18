import { Module } from '@nestjs/common';
import { MaterialRequestsService } from './material-requests.service';
import { MaterialRequestsController } from './material-requests.controller';

@Module({
  controllers: [MaterialRequestsController],
  providers: [MaterialRequestsService],
})
export class MaterialRequestsModule {}
