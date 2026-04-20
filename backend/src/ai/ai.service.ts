// backend/src/ai/ai.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from '../reports/reports.service';
import Groq from 'groq-sdk'; // <-- import

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private groqClient: Groq | null = null;

  constructor(
    private prisma: PrismaService,
    private reportsService: ReportsService,
  ) {
    // Inisialisasi Groq jika API key tersedia
    if (process.env.GROQ_API_KEY && process.env.AI_PROVIDER === 'groq') {
      this.groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
      this.logger.log('Groq AI client initialized');
    } else {
      this.logger.warn('Groq AI not configured, using fallback responses');
    }
  }

  // ========== MENU TREE ==========
  async getMenuTree() {
    return {
      main: [
        { label: '📊 Data NG', value: 'ng' },
        { label: '📈 Data Output', value: 'output' },
        { label: '📋 Status WIP', value: 'wip' },
        { label: '📑 Laporan', value: 'report' },
        { label: '🔍 Navigasi', value: 'navigate' },
      ],
      sub: {
        ng: [
          { label: 'Cutting Pond', query: 'ng_cutting_pond' },
          { label: 'Check Panel', query: 'ng_check_panel' },
          { label: 'Quality Control', query: 'ng_qc' },
          { label: 'Semua NG', query: 'total_ng_today' },
        ],
        output: [
          { label: 'Output Packing (sets)', query: 'total_output_today' },
          { label: 'Output Sewing (sets)', query: 'total_output_sewing_today' },
          { label: 'Output Cutting Entan (sets)', query: 'total_output_cutting_entan_today' },
        ],
        wip: [
          { label: 'Jumlah OP WIP', query: 'wip_ops_count' },
          { label: 'WIP per Station', query: 'wip_by_station' },
        ],
        report: [
          { label: 'Laporan NG (Pond & CP)', path: '/reports?type=ng-pond-cp' },
          { label: 'Laporan NG QC', path: '/reports?type=ng-quality-control' },
          { label: 'Traceability OP', path: '/traceability' },
        ],
        navigate: [
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Target Monitoring', path: '/target-monitoring' },
          { label: 'Manpower Monitoring', path: '/manpower-monitoring' },
        ],
      },
    };
  }

  // ========== HANDLE DYNAMIC QUERY (DIPERLENGKAP) ==========
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
        const pondNg = await this.prisma.productionLog.aggregate({
          where: { station: 'CUTTING_POND', type: 'NG', createdAt: { gte: startOfDay, lte: endOfDay } },
          _sum: { qty: true },
        });
        const total = (cpNg._sum.ng || 0) + (qcNg._sum.ng || 0) + (pondNg._sum.qty || 0);
        return `Total NG hari ini: ${total} pcs.\nDetail:\n- Cutting Pond: ${pondNg._sum.qty || 0}\n- Check Panel: ${cpNg._sum.ng || 0}\n- QC: ${qcNg._sum.ng || 0}`;
      }
      case 'ng_cutting_pond': {
        const pondNg = await this.prisma.productionLog.aggregate({
          where: { station: 'CUTTING_POND', type: 'NG', createdAt: { gte: startOfDay, lte: endOfDay } },
          _sum: { qty: true },
        });
        return `NG Cutting Pond hari ini: ${pondNg._sum.qty || 0} pcs.`;
      }
      case 'ng_check_panel': {
        const cpNg = await this.prisma.checkPanelInspection.aggregate({
          where: { createdAt: { gte: startOfDay, lte: endOfDay } },
          _sum: { ng: true },
        });
        return `NG Check Panel hari ini: ${cpNg._sum.ng || 0} pcs.`;
      }
      case 'ng_qc': {
        const qcNg = await this.prisma.qcInspection.aggregate({
          where: { createdAt: { gte: startOfDay, lte: endOfDay } },
          _sum: { ng: true },
        });
        return `NG Quality Control hari ini: ${qcNg._sum.ng || 0} pcs.`;
      }
      case 'total_output_today': {
        const sessions = await this.prisma.packingSession.aggregate({
          where: { status: 'CLOSED', createdAt: { gte: startOfDay, lte: endOfDay } },
          _sum: { totalQty: true },
        });
        return `Total output hari ini (packed sets): ${sessions._sum.totalQty || 0} sets.`;
      }
      case 'total_output_sewing_today': {
        const sewingFinish = await this.prisma.productionLog.aggregate({
          where: { station: 'SEWING', type: 'SEWING_FINISH', createdAt: { gte: startOfDay, lte: endOfDay } },
          _sum: { qty: true },
        });
        return `Total output Sewing hari ini: ${sewingFinish._sum.qty || 0} sets.`;
      }
      case 'total_output_cutting_entan_today': {
        const cuttingBatches = await this.prisma.cuttingBatch.aggregate({
          where: { createdAt: { gte: startOfDay, lte: endOfDay } },
          _sum: { qty: true },
        });
        return `Total output Cutting Entan hari ini: ${cuttingBatches._sum.qty || 0} sets.`;
      }
      case 'defect_rate_today': {
        const cpGood = await this.prisma.checkPanelInspection.aggregate({ where: { createdAt: { gte: startOfDay, lte: endOfDay } }, _sum: { good: true } });
        const cpNg = await this.prisma.checkPanelInspection.aggregate({ where: { createdAt: { gte: startOfDay, lte: endOfDay } }, _sum: { ng: true } });
        const qcGood = await this.prisma.qcInspection.aggregate({ where: { createdAt: { gte: startOfDay, lte: endOfDay } }, _sum: { good: true } });
        const qcNg = await this.prisma.qcInspection.aggregate({ where: { createdAt: { gte: startOfDay, lte: endOfDay } }, _sum: { ng: true } });
        const pondNg = await this.prisma.productionLog.aggregate({ where: { station: 'CUTTING_POND', type: 'NG', createdAt: { gte: startOfDay, lte: endOfDay } }, _sum: { qty: true } });
        const totalGood = (cpGood._sum.good || 0) + (qcGood._sum.good || 0);
        const totalNg = (cpNg._sum.ng || 0) + (qcNg._sum.ng || 0) + (pondNg._sum.qty || 0);
        const total = totalGood + totalNg;
        const rate = total > 0 ? ((totalNg / total) * 100).toFixed(1) : '0';
        return `Defect rate hari ini: ${rate}% (${totalNg} NG dari ${total} total).\nDetail:\n- Cutting Pond NG: ${pondNg._sum.qty || 0}\n- Check Panel NG: ${cpNg._sum.ng || 0}\n- QC NG: ${qcNg._sum.ng || 0}`;
      }
      case 'wip_ops_count': {
        const count = await this.prisma.productionOrder.count({ where: { status: 'WIP' } });
        return `Saat ini ada ${count} production orders dalam status WIP.`;
      }
      case 'wip_by_station': {
        const wipOps = await this.prisma.productionOrder.findMany({
          where: { status: 'WIP' },
          select: { currentStation: true },
        });
        const stationCount: Record<string, number> = {};
        wipOps.forEach(op => {
          const station = op.currentStation || 'UNKNOWN';
          stationCount[station] = (stationCount[station] || 0) + 1;
        });
        let response = 'Distribusi WIP per stasiun:\n';
        for (const [station, count] of Object.entries(stationCount)) {
          response += `- ${station}: ${count} OP\n`;
        }
        return response;
      }
      default:
        return 'Maaf, saya belum bisa menjawab pertanyaan itu.';
    }
  }

  // ========== PANGGIL AI EKSTERNAL (BARU) ==========
  private async callExternalAI(message: string): Promise<string> {
    if (!this.groqClient) {
      return "Maaf, saya belum bisa menjawab pertanyaan itu. Silakan coba tanyakan tentang produksi, NG, atau minta report.";
    }

    try {
      const chatCompletion = await this.groqClient.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `Anda adalah Feby, asisten AI untuk sistem produksi pabrik garmen (NextG App). 
Anda membantu operator dan manajer produksi. Jawablah dengan bahasa Indonesia yang ramah, singkat, dan jelas. 
Jika ditanya tentang data produksi (NG, output, WIP, dll), arahkan user untuk menggunakan menu yang tersedia atau bertanya dengan kata kunci spesifik seperti "total ng hari ini". 
Jangan pernah memberikan informasi palsu. Jika tidak tahu, katakan tidak tahu.`
          },
          {
            role: "user",
            content: message
          }
        ],
        model: "llama-3.3-70b-versatile", // model gratis terbaik di Groq
        temperature: 0.7,
        max_tokens: 300,
      });

      const reply = chatCompletion.choices[0]?.message?.content || "Maaf, saya tidak bisa menjawab saat ini.";
      return reply;
    } catch (error: any) {
      this.logger.error(`Groq API error: ${error.message}`);
      return "Maaf, terjadi gangguan teknis. Silakan coba lagi nanti.";
    }
  }

  // ========== PROCESS MESSAGE (MODIFIKASI) ==========
  async processMessage(message: string, userId?: string) {
    const lowerMsg = message.toLowerCase().trim();

    // Deteksi pilihan menu dari quick reply
    let responseText = '';
    let action: any = null;
    let options: any[] = [];

    // Menu navigation commands
    if (lowerMsg === 'menu_main') {
      const menu = await this.getMenuTree();
      responseText = 'Pilih menu:';
      options = menu.main.map(item => ({ label: item.label, value: item.value }));
    } 
    else if (lowerMsg === 'ng') {
      const menu = await this.getMenuTree();
      responseText = 'Pilih jenis NG:';
      options = menu.sub.ng.map(item => ({ label: item.label, value: item.query }));
    }
    else if (lowerMsg === 'output') {
      const menu = await this.getMenuTree();
      responseText = 'Pilih jenis output:';
      options = menu.sub.output.map(item => ({ label: item.label, value: item.query }));
    }
    else if (lowerMsg === 'wip') {
      const menu = await this.getMenuTree();
      responseText = 'Pilih informasi WIP:';
      options = menu.sub.wip.map(item => ({ label: item.label, value: item.query }));
    }
    else if (lowerMsg === 'report') {
      const menu = await this.getMenuTree();
      responseText = 'Pilih laporan:';
      options = menu.sub.report.map(item => ({ label: item.label, value: item.path, type: 'navigate' }));
    }
    else if (lowerMsg === 'navigate') {
      const menu = await this.getMenuTree();
      responseText = 'Pilih halaman:';
      options = menu.sub.navigate.map(item => ({ label: item.label, value: item.path, type: 'navigate' }));
    }
    else if (['ng_cutting_pond', 'ng_check_panel', 'ng_qc', 'total_output_sewing_today', 'total_output_cutting_entan_today', 'wip_by_station'].includes(lowerMsg)) {
      responseText = await this.handleDynamicQuery(lowerMsg);
      options = [{ label: '🏠 Kembali ke Menu Utama', value: 'menu_main' }];
    }
    else {
      // Intent matching biasa (existing code)
      const intents = await this.prisma.aiIntent.findMany({ where: { isActive: true } });
      let matchedIntent: any = null;
      for (const intent of intents) {
        const keywords = intent.triggerKeywords as string[];
        if (keywords.some(kw => lowerMsg.includes(kw.toLowerCase()))) {
          matchedIntent = intent;
          break;
        }
      }
      if (!matchedIntent) {
        // === INI BAGIAN BARU: tidak ada intent cocok, panggil AI eksternal ===
        responseText = await this.callExternalAI(message);
        // Tidak menambahkan options agar user bisa lanjut ngobrol natural
        // Tapi tetap beri tombol kembali ke menu utama
        options = [{ label: '🏠 Menu Utama', value: 'menu_main' }];
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
            action = { type: 'navigate', path: '/reports', params: data.reportParams || {} };
            responseText = data.text || `Saya akan membawa Anda ke halaman report ${data.reportType || ''}.`;
            break;
          case 'navigate':
            action = { type: 'navigate', path: data.path };
            responseText = data.text || 'Mengalihkan Anda ke halaman yang diminta.';
            break;
          default:
            responseText = 'Permintaan tidak dikenali.';
        }
        if (responseText && !action) {
          options = [{ label: '🏠 Menu Utama', value: 'menu_main' }];
        }
      }
    }

    // Simpan percakapan
    await this.prisma.aiConversation.create({
      data: {
        userId: userId || null,
        message,
        response: responseText,
      },
    });

    return { response: responseText, action, options };
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