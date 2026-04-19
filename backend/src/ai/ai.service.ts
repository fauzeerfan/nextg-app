import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from '../reports/reports.service';

@Injectable()
export class AiService {
  constructor(
    private prisma: PrismaService,
    private reportsService: ReportsService,
  ) {}

  async processMessage(message: string, userId?: string) {
    const lowerMsg = message.toLowerCase().trim();

    const intents = await this.prisma.aiIntent.findMany({
      where: { isActive: true },
    });

    let matchedIntent: any = null; // ✅ fix

    for (const intent of intents) {
      const keywords = intent.triggerKeywords as string[];
      if (keywords.some(kw => lowerMsg.includes(kw.toLowerCase()))) {
        matchedIntent = intent;
        break;
      }
    }

    let responseText = '';
    let action: any = null; // ✅ fix

    if (!matchedIntent) {
      responseText = "Maaf, saya tidak mengerti pertanyaan Anda. Coba tanyakan tentang produksi, NG, atau minta report.";
    } else {
      const type = matchedIntent.responseType;
      const data = matchedIntent.responseData as any;

      switch (type) {
        case 'text':
          responseText = data.text;
          break;
        case 'dynamic':
          responseText = await this.handleDynamicQuery(data.query);
          break;
        case 'report':
          action = {
            type: 'navigate',
            path: '/reports',
            params: data.reportParams || {},
          };
          responseText = data.text || `Saya akan membawa Anda ke halaman report ${data.reportType || ''}.`;
          break;
        case 'navigate':
          action = {
            type: 'navigate',
            path: data.path,
          };
          responseText = data.text || 'Mengalihkan Anda ke halaman yang diminta.';
          break;
        default:
          responseText = 'Permintaan tidak dikenali.';
      }
    }

    await this.prisma.aiConversation.create({
      data: {
        userId: userId || null,
        message,
        response: responseText,
      },
    });

    return { response: responseText, action };
  }

  private async handleDynamicQuery(query: string): Promise<string> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);

    switch (query) {
      case 'total_ng_today': {
        const cpNg = await this.prisma.checkPanelInspection.aggregate({
          where: { createdAt: { gte: startOfDay, lte: endOfDay } },
          _sum: { ng: true },
        });
        const qcNg = await this.prisma.qcInspection.aggregate({
          where: { createdAt: { gte: startOfDay, lte: endOfDay } },
          _sum: { ng: true },
        });
        const total = (cpNg._sum.ng || 0) + (qcNg._sum.ng || 0);
        return `Total NG hari ini: ${total} pcs.`;
      }
      case 'total_output_today': {
        const sessions = await this.prisma.packingSession.aggregate({
          where: { status: 'CLOSED', createdAt: { gte: startOfDay, lte: endOfDay } },
          _sum: { totalQty: true },
        });
        const output = sessions._sum.totalQty || 0;
        return `Total output hari ini (packed sets): ${output} sets.`;
      }
      case 'defect_rate_today': {
        const cpGood = await this.prisma.checkPanelInspection.aggregate({
          where: { createdAt: { gte: startOfDay, lte: endOfDay } },
          _sum: { good: true },
        });
        const cpNg = await this.prisma.checkPanelInspection.aggregate({
          where: { createdAt: { gte: startOfDay, lte: endOfDay } },
          _sum: { ng: true },
        });
        const qcGood = await this.prisma.qcInspection.aggregate({
          where: { createdAt: { gte: startOfDay, lte: endOfDay } },
          _sum: { good: true },
        });
        const qcNg = await this.prisma.qcInspection.aggregate({
          where: { createdAt: { gte: startOfDay, lte: endOfDay } },
          _sum: { ng: true },
        });
        const totalGood = (cpGood._sum.good || 0) + (qcGood._sum.good || 0);
        const totalNg = (cpNg._sum.ng || 0) + (qcNg._sum.ng || 0);
        const total = totalGood + totalNg;
        const rate = total > 0 ? ((totalNg / total) * 100).toFixed(1) : '0';
        return `Defect rate hari ini: ${rate}% (${totalNg} NG dari ${total} total).`;
      }
      case 'wip_ops_count': {
        const count = await this.prisma.productionOrder.count({
          where: { status: 'WIP' },
        });
        return `Saat ini ada ${count} production orders dalam status WIP.`;
      }
      default:
        return 'Maaf, saya belum bisa menjawab pertanyaan itu.';
    }
  }

  async getAllIntents() {
    return this.prisma.aiIntent.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createIntent(data: any) {
    return this.prisma.aiIntent.create({ data });
  }

  async updateIntent(id: string, data: any) {
    return this.prisma.aiIntent.update({ where: { id }, data });
  }

  async deleteIntent(id: string) {
    return this.prisma.aiIntent.delete({ where: { id } });
  }
}