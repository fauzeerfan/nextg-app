import { Module } from '@nestjs/common';
import { ProductionSyncService } from './production-sync.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [ProductionSyncService, PrismaService],
})
export class ProductionSyncModule {}
