import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TraceabilityController } from './traceability.controller';
import { TraceabilityService } from './traceability.service';
import { TraceabilityExtendedController } from './traceability-extended.controller';
import { TraceabilityExtendedService } from './traceability-extended.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, HttpModule],
  controllers: [TraceabilityController, TraceabilityExtendedController],
  providers: [TraceabilityService, TraceabilityExtendedService],
  exports: [TraceabilityService, TraceabilityExtendedService],
})
export class TraceabilityModule {}