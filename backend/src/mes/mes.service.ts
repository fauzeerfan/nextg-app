import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MesService {
  private logger = new Logger('MES');

  constructor(private prisma: PrismaService) {}

  /////////////////////////////////////////////////////////////////
  // GET ALL OPS (dashboard & device)
  /////////////////////////////////////////////////////////////////
  async getAllOps() {
    return this.prisma.productionOrder.findMany({
      include: { line: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /////////////////////////////////////////////////////////////////
  // GET OPS BY STATION
  /////////////////////////////////////////////////////////////////
  async getOpsByStation(station: string) {
    return this.prisma.productionOrder.findMany({
      where: {
        currentStation: station as any,
        status: 'WIP',
      },
      include: { line: true },
      orderBy: { createdAt: 'asc' },
    });
  }
}
