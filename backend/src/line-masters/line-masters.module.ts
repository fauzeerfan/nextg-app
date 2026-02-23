import { Module } from '@nestjs/common';
import { LineMastersService } from './line-masters.service';
import { LineMastersController } from './line-masters.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LineMastersController],
  providers: [LineMastersService],
  exports: [LineMastersService],
})
export class LineMastersModule {}