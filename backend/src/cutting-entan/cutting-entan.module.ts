import { Module } from '@nestjs/common';
import { CuttingEntanService } from './cutting-entan.service';
import { CuttingEntanController } from './cutting-entan.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [PrismaModule, SettingsModule],
  providers: [CuttingEntanService],
  controllers: [CuttingEntanController],
})
export class CuttingEntanModule {}