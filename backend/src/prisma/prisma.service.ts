import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // Method ini dipanggil saat aplikasi start
  async onModuleInit() {
    await this.$connect();
  }

  // Method ini dipanggil saat aplikasi stop (cleanup)
  async onModuleDestroy() {
    await this.$disconnect();
  }
}