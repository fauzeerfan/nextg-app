import { Module } from '@nestjs/common';
import { ProductionOrdersService } from './production-orders.service';
import { ProductionOrdersController } from './production-orders.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CuttingSyncScheduler } from './cutting-sync.scheduler';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [PrismaModule, SettingsModule],
  controllers: [ProductionOrdersController],
  providers: [ProductionOrdersService, CuttingSyncScheduler],
})
export class ProductionOrdersModule {}