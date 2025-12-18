import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Decorator ini membuat PrismaService bisa dipakai di mana saja tanpa import module berulang kali
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}