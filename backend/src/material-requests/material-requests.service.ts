import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MaterialRequestsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: any) {
    const dateStr = new Date().toISOString().slice(0,10).replace(/-/g,'');
    const count = await this.prisma.materialRequest.count();
    const reqNo = `MR-${dateStr}-${(count + 1).toString().padStart(3, '0')}`;
    
    // FIX: Ambil opNumber string untuk snapshot
    const op = await this.prisma.productionOrder.findUnique({ where: { id: dto.opId } });

    return this.prisma.materialRequest.create({
      data: {
        reqNo,
        opId: dto.opId,
        opNumber: op ? op.opNumber : 'UNKNOWN',
        partName: dto.partName,
        qtyNeeded: dto.qty,
        reason: dto.reason,
        status: 'PENDING',
        requesterId: null 
      }
    });
  }

  async findAll() {
    return this.prisma.materialRequest.findMany({ orderBy: { createdAt: 'desc' } });
  }

  // NEW: Method Update Status
  async updateStatus(id: string, status: string) {
      // Validasi status
      const validStatuses = ['APPROVED', 'REJECTED', 'SUPPLIED'];
      if(!validStatuses.includes(status)) throw new Error('Invalid Status');

      return this.prisma.materialRequest.update({
          where: { reqNo: id }, // Kita pakai reqNo sebagai ID di frontend, pastikan match
          data: { status }
      });
  }
}