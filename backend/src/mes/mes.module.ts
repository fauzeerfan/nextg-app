import { Module, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductionEngineService } from './production-engine.service';
import { PondController } from './pond.controller';
import { IotModule } from '../iot/iot.module';

@Module({
  imports: [forwardRef(() => IotModule)], // gunakan forwardRef
  controllers: [PondController],
  providers: [ProductionEngineService, PrismaService],
  exports: [ProductionEngineService],
})
export class MesModule {}