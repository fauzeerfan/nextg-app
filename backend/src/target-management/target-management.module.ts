import { Module } from '@nestjs/common';
import { TargetManagementService } from './target-management.service';
import { TargetManagementController } from './target-management.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TargetManagementController],
  providers: [TargetManagementService],
  exports: [TargetManagementService],
})
export class TargetManagementModule {}