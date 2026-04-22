import { Module } from '@nestjs/common';
import { ProductionPlanningController } from './production-planning.controller';
import { ProductionPlanningService } from './production-planning.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProductionPlanningController],
  providers: [ProductionPlanningService],
})
export class ProductionPlanningModule {}