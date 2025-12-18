import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductionOrdersService {
  constructor(private prisma: PrismaService) {}

  // --- QUERY METHODS ---
  
  async findActiveForStation(station: string) {
    return (this.prisma as any).productionOrder.findMany({
      where: {
        currentStation: station,
        status: { in: ['SCHEDULED', 'WIP'] }
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  async findHistoryForStation(station: string) {
    if (station === 'CUTTING') {
       return (this.prisma as any).productionOrder.findMany({
        where: {
           cutQty: { gt: 0 },
           OR: [
             { status: 'COMPLETED' },
             { currentStation: { not: 'CUTTING' } }
           ]
        },
        orderBy: { updatedAt: 'desc' },
        take: 50 
       });
    }
    return [];
  }

  async findOne(id: string) {
    return (this.prisma as any).productionOrder.findUnique({ where: { id } });
  }

  async getDashboardStats() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()); 

    const activeOps = await (this.prisma as any).productionOrder.findMany({
        where: { status: { in: ['WIP', 'COMPLETED', 'COMPLETED_CUTTING'] } },
        select: { cutQty: true, packedQty: true, currentStation: true }
    });

    const totalWip = activeOps.reduce((acc, op) => acc + (op.cutQty - op.packedQty), 0);
    
    const packingLogs = await (this.prisma as any).stationLog.aggregate({
        _sum: { qtyGood: true },
        where: {
            station: 'PACKING',
            actionType: 'PACKING_OUT',
            timestamp: { gte: startOfDay }
        }
    });

    const inspectionLogs = await (this.prisma as any).stationLog.aggregate({
        _sum: { qtyGood: true, qtyNG: true },
        where: {
            actionType: 'INSPECT', 
            timestamp: { gte: startOfDay }
        }
    });
    const totalInspected = (inspectionLogs._sum.qtyGood || 0) + (inspectionLogs._sum.qtyNG || 0);
    const ngRate = totalInspected > 0 
        ? ((inspectionLogs._sum.qtyNG || 0) / totalInspected) * 100 
        : 0;

    const stationGroup = await (this.prisma as any).productionOrder.groupBy({
        by: ['currentStation'],
        where: { status: { not: 'CLOSED_FG' } }, 
        _count: { id: true }
    });

    const recentOps = await (this.prisma as any).productionOrder.findMany({
        where: { status: { not: 'CLOSED_FG' } },
        orderBy: { updatedAt: 'desc' },
        take: 10 
    });

    return {
        kpi: {
            wip: totalWip,
            output: packingLogs._sum.qtyGood || 0,
            ngRate: ngRate.toFixed(1),
            speed: Math.round((packingLogs._sum.qtyGood || 0) / 8) 
        },
        stations: stationGroup.map(s => ({
            name: s.currentStation,
            count: s._count.id
        })),
        activeOps: recentOps
    };
  }

  // --- TOOLS ---

  async createSimulation(dto: any) {
      return (this.prisma as any).productionOrder.create({
          data: {
              opNumber: dto.opNumber,
              styleCode: dto.styleCode,
              buyer: dto.buyer || 'Internal',
              targetQty: Number(dto.targetQty),
              status: 'SCHEDULED',
              currentStation: 'CUTTING' 
          }
      });
  }

  // FIX: Menggunakan TRUNCATE CASCADE (Nuclear Option)
  // Ini jauh lebih kuat daripada deleteMany() karena mengabaikan urutan foreign key
  async resetSystemData() {
      try {
          // Daftar tabel transaksi yang harus dibersihkan
          // Pastikan nama tabel di sini sama persis dengan @@map("nama_tabel") di schema.prisma
          const tableNames = [
            "station_logs", 
            "material_requests", 
            "op_replacements", 
            "bundles", 
            "fg_stocks", 
            "production_orders"
          ];
          
          // Buat query raw SQL: TRUNCATE TABLE "t1", "t2" ... RESTART IDENTITY CASCADE;
          const tables = tableNames.map(t => `"${t}"`).join(', ');
          
          // Eksekusi Raw SQL
          await this.prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE;`);

          return { message: 'Factory Reset Successful. Transaction Data Wiped.' };
      } catch (error) {
          console.error("Reset Failed:", error);
          throw new InternalServerErrorException("Failed to reset system data.");
      }
  }
}