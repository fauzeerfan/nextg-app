import { Module, forwardRef } from '@nestjs/common';
import { IotController } from './iot.controller';
import { IotService } from './iot.service';
import { IotDeviceService } from './iot-device.service';
import { PrismaService } from '../prisma/prisma.service';
import { MesModule } from '../mes/mes.module';

@Module({
  imports: [forwardRef(() => MesModule)], // gunakan forwardRef
  controllers: [IotController],
  providers: [IotService, IotDeviceService, PrismaService],
  exports: [IotService, IotDeviceService],
})
export class IotModule {}