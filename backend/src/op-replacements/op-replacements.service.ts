import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OpReplacementsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: any) {
    const op = await this.prisma.productionOrder.findUnique({ where: { id: dto.opId } });
    if (!op) throw new NotFoundException('OP Not Found');

    const dateStr = new Date().toISOString().slice(0,10).replace(/-/g,'');
    const count = await this.prisma.opReplacement.count();
    const reqNo = `REP-${dateStr}-${(count + 1).toString().padStart(3, '0')}`;
    const newOpIdentity = `${op.opNumber}-R${count + 1}`;

    return this.prisma.opReplacement.create({
      data: {
        reqNo,
        originalOpId: op.id,
        originalOp: op.opNumber,
        newOpIdentity,
        qty: dto.qty,
        reasonNG: dto.reason, // pastikan field ini sesuai schema (reasonNG)
        status: 'SUBMITTED'
      }
    });
  }

  async findAll() {
    return this.prisma.opReplacement.findMany({ orderBy: { createdAt: 'desc' } });
  }

  // NEW: Update Status
  async updateStatus(id: string, status: string) {
    return this.prisma.opReplacement.update({
        where: { reqNo: id },
        data: { status }
    });
  }
}