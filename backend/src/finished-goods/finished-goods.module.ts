import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FinishedGoodsController } from './finished-goods.controller';
import { FinishedGoodsService } from './finished-goods.service';
import { ExternalShippingService } from './external-shipping.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    HttpModule, // <-- tambahkan HttpModule
  ],
  controllers: [FinishedGoodsController],
  providers: [FinishedGoodsService, ExternalShippingService],
})
export class FinishedGoodsModule {}