import { Module } from '@nestjs/common';
import { CuttingEntanService } from './cutting-entan.service';
import { CuttingEntanController } from './cutting-entan.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [CuttingEntanService],
  controllers: [CuttingEntanController],
})
export class CuttingEntanModule {}
