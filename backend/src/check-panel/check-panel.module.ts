import { Module } from '@nestjs/common';
import { CheckPanelController } from './check-panel.controller';
import { CheckPanelService } from './check-panel.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CheckPanelController],
  providers: [CheckPanelService],
})
export class CheckPanelModule {}