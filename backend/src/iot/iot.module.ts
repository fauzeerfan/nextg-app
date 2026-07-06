import { Module, forwardRef } from '@nestjs/common';
import { IotController } from './iot.controller';
import { IotService } from './iot.service';
import { IotDeviceService } from './iot-device.service';
import { PrismaService } from '../prisma/prisma.service';
import { MesModule } from '../mes/mes.module';
import { ManpowerModule } from '../manpower/manpower.module';

@Module({
  imports: [forwardRef(() => MesModule), ManpowerModule], // ManpowerModule utk check-in absensi via Dhristi
  controllers: [IotController],
  providers: [IotService, IotDeviceService, PrismaService],
  exports: [IotService, IotDeviceService],
})
export class IotModule {}