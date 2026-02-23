import { Module } from '@nestjs/common';
import { FinishedGoodsController } from './finished-goods.controller';
import { FinishedGoodsService } from './finished-goods.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FinishedGoodsController],
  providers: [FinishedGoodsService],
})
export class FinishedGoodsModule {}