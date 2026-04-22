import { Module } from '@nestjs/common';
import { InboundWarehouseController } from './inbound-warehouse.controller';
import { InboundWarehouseService } from './inbound-warehouse.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [InboundWarehouseController],
  providers: [InboundWarehouseService],
})
export class InboundWarehouseModule {}