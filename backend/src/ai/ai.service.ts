// backend/src/ai/ai.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from '../reports/reports.service';
import Groq from 'groq-sdk';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private groqClient: Groq | null = null;

  constructor(
    private prisma: PrismaService,
    private reportsService: ReportsService,
  ) {
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
        { label: '⚠️ Data NG', value: 'ng' },
        { label: '📈 Data Output', value: 'output' },
        { label: '🔄 Status WIP', value: 'wip' },
        { label: '👥 Manpower', value: 'manpower' },
        { label: '📑 Laporan', value: 'report' },
        { label: '🗺️ Navigasi', value: 'navigate' },
      ],
      sub: {
        ng: [
          { label: 'Cutting Pond', query: 'ng_cutting_pond' },
          { label: 'Check Panel', query: 'ng_check_panel' },
          { label: 'Quality Control', query: 'ng_qc' },
          { label: 'Semua NG', query: 'total_ng_today' },
          { label: 'Defect Rate', query: 'defect_rate_today' },
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
        manpower: [
          { label: 'Total Kehadiran Hari Ini', query: 'manpower_today' },
          { label: 'Kehadiran per Stasiun', query: 'attendance_by_station' },
        ],
        report: [
          { label: 'Laporan NG (Pond & CP)', path: '/reports?type=ng-pond-cp' },
          { label: 'Laporan NG QC', path: '/reports?type=ng-quality-control' },
          { label: 'Traceability OP', path: '/traceability' },
          { label: 'Target Monitoring', path: '/target-monitoring' },
          { label: 'Plan vs Actual', path: '/plan-vs-actual' },
        ],
        navigate: [
          { label: '🏠 Dashboard', path: '/dashboard' },
          { label: '🎯 Target Monitoring', path: '/target-monitoring' },
          { label: '👁️ Manpower Monitoring', path: '/manpower-monitoring' },
          { label: '📲 Manpower Control', path: '/manpower-control' },
          { label: '👤 Employee Management', path: '/employee-management' },
          { label: '✂️ Cutting Entan', path: '/cutting-entan' },
          { label: '🌊 Cutting Pond', path: '/cutting-pond' },
          { label: '🔍 Check Panel', path: '/check-panel' },
          { label: '🧵 Sewing', path: '/sewing' },
          { label: '✅ Quality Control', path: '/quality-control' },
          { label: '📦 Packing', path: '/packing' },
          { label: '🏭 Finished Goods', path: '/finished-goods' },
          { label: '📑 Reports', path: '/reports' },
          { label: '🔎 Traceability', path: '/traceability' },
          { label: '📥 Inbound Receiving', path: '/inbound-receiving' },
          { label: '🗃️ Inventory Control', path: '/inventory-control' },
          { label: '📉 Demand Simulator', path: '/demand-simulator' },
          { label: '⚡ Capacity Dashboard', path: '/capacity-dashboard' },
          { label: '📊 Gantt Simulation', path: '/gantt-simulation' },
          { label: '📈 Plan vs Actual', path: '/plan-vs-actual' },
          { label: '🏝️ Automation Island', path: '/automation-island' },
        ],
      },
    };
  }

  // ========== HANDLE DYNAMIC QUERY ==========
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
        return `Defect rate hari ini: ${rate}%\nTotal: ${totalNg} NG dari ${total} pcs diperiksa.\nDetail:\n- Cutting Pond NG: ${pondNg._sum.qty || 0}\n- Check Panel NG: ${cpNg._sum.ng || 0}\n- QC NG: ${qcNg._sum.ng || 0}`;
      }
      case 'wip_ops_count': {
        const count = await this.prisma.productionOrder.count({ where: { status: 'WIP', level: { not: 'PARENT' } } });
        return `Saat ini ada ${count} production orders dalam status WIP.`;
      }
      case 'wip_by_station': {
        const wipOps = await this.prisma.productionOrder.findMany({
          where: { status: 'WIP', level: { not: 'PARENT' } },
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
        if (Object.keys(stationCount).length === 0) response += '- Tidak ada WIP saat ini.\n';
        return response;
      }
      case 'manpower_today': {
        try {
          const todayUTC = new Date();
          todayUTC.setUTCHours(0, 0, 0, 0);
          const tomorrowUTC = new Date(todayUTC);
          tomorrowUTC.setUTCDate(tomorrowUTC.getUTCDate() + 1);
          const count = await this.prisma.manpowerAttendance.count({
            where: { tanggal: { gte: todayUTC, lt: tomorrowUTC } },
          });
          return `Total kehadiran hari ini: ${count} karyawan hadir.`;
        } catch {
          return 'Tidak dapat mengambil data kehadiran saat ini.';
        }
      }
      case 'attendance_by_station': {
        try {
          const todayUTC = new Date();
          todayUTC.setUTCHours(0, 0, 0, 0);
          const tomorrowUTC = new Date(todayUTC);
          tomorrowUTC.setUTCDate(tomorrowUTC.getUTCDate() + 1);
          const records = await this.prisma.manpowerAttendance.findMany({
            where: { tanggal: { gte: todayUTC, lt: tomorrowUTC } },
            select: { station: true },
          });
          const stationCount: Record<string, number> = {};
          records.forEach((r: any) => {
            const s = r.station || 'UNKNOWN';
            stationCount[s] = (stationCount[s] || 0) + 1;
          });
          let response = `Total hadir: ${records.length} karyawan\nPer stasiun:\n`;
          for (const [station, count] of Object.entries(stationCount)) {
            response += `- ${station}: ${count} orang\n`;
          }
          if (records.length === 0) response = 'Belum ada data kehadiran hari ini.';
          return response;
        } catch {
          return 'Tidak dapat mengambil data kehadiran per stasiun.';
        }
      }
      default:
        return 'Maaf, saya belum bisa menjawab pertanyaan itu.';
    }
  }

  // ========== PANGGIL AI EKSTERNAL ==========
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
Jika ditanya tentang data produksi (NG, output, WIP, manpower, dll), arahkan user untuk menggunakan menu yang tersedia.
Anda memahami istilah produksi garmen: OP (production order), WIP (work in progress), NG (not good/reject), CP (check panel), QC (quality control), FG (finished goods), sets, pcs, cutting, sewing, packing.
Jangan pernah memberikan informasi palsu. Jika tidak tahu, katakan tidak tahu dengan ramah.`
          },
          {
            role: "user",
            content: message
          }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 400,
      });

      const reply = chatCompletion.choices[0]?.message?.content || "Maaf, saya tidak bisa menjawab saat ini.";
      return reply;
    } catch (error: any) {
      this.logger.error(`Groq API error: ${error.message}`);
      return "Maaf, terjadi gangguan teknis. Silakan coba lagi nanti.";
    }
  }

  private async searchKnowledge(message: string): Promise<{ content: string } | null> {
    const lowerMsg = message.toLowerCase();

    const allKnowledge = await this.prisma.aiKnowledge.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    if (allKnowledge.length === 0) return null;

    for (const k of allKnowledge) {
      if (k.keywords) {
        const keywords = k.keywords.toLowerCase().split(',').map(kw => kw.trim());
        if (keywords.some(kw => lowerMsg.includes(kw))) {
          return { content: k.content };
        }
      }
    }

    for (const k of allKnowledge) {
      const contentWords = k.content.toLowerCase().split(' ').slice(0, 5);
      if (contentWords.some(word => word.length > 3 && lowerMsg.includes(word))) {
        return { content: k.content };
      }
    }

    if (lowerMsg.length > 10) {
      for (const k of allKnowledge) {
        if (k.content.toLowerCase().includes(lowerMsg) || lowerMsg.includes(k.content.toLowerCase().substring(0, 20))) {
          return { content: k.content };
        }
      }
    }

    return null;
  }

  // ========== PROCESS MESSAGE ==========
  async processMessage(message: string, userId?: string) {
    const lowerMsg = message.toLowerCase().trim();

    // Save knowledge command
    const saveKnowledgePrefix = 'tolong simpan informasi ini :';
    if (lowerMsg.startsWith(saveKnowledgePrefix)) {
      const knowledgeContent = message.substring(saveKnowledgePrefix.length).trim();
      if (knowledgeContent) {
        try {
          const keywords = knowledgeContent.split(' ').slice(0, 5).join(',');
          await this.prisma.aiKnowledge.create({
            data: {
              content: knowledgeContent,
              keywords: keywords,
              createdBy: userId || null,
            },
          });
          const responseText = `Baik, informasi telah saya simpan! ✅ Terima kasih. Saya akan mengingat ini untuk menjawab pertanyaan serupa.`;
          await this.prisma.aiConversation.create({
            data: { userId: userId || null, message, response: responseText },
          });
          return { response: responseText, action: null, options: [{ label: '🏠 Menu Utama', value: 'menu_main' }] };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error(`Failed to save knowledge: ${errorMessage}`);
          return { response: 'Maaf, terjadi kesalahan saat menyimpan informasi.', action: null, options: [{ label: '🏠 Menu Utama', value: 'menu_main' }] };
        }
      }
    }

    let responseText = '';
    let action: any = null;
    let options: any[] = [];

    // ===== DIRECT MENU HANDLERS =====
    if (lowerMsg === 'menu_main') {
      const menu = await this.getMenuTree();
      responseText = 'Pilih menu yang Anda butuhkan:';
      options = menu.main.map(item => ({ label: item.label, value: item.value }));
    }
    else if (lowerMsg === 'ng') {
      const menu = await this.getMenuTree();
      responseText = 'Pilih jenis data NG:';
      options = menu.sub.ng.map(item => ({ label: item.label, value: item.query }));
    }
    else if (lowerMsg === 'output') {
      const menu = await this.getMenuTree();
      responseText = 'Pilih jenis data output:';
      options = menu.sub.output.map(item => ({ label: item.label, value: item.query }));
    }
    else if (lowerMsg === 'wip') {
      const menu = await this.getMenuTree();
      responseText = 'Pilih informasi WIP:';
      options = menu.sub.wip.map(item => ({ label: item.label, value: item.query }));
    }
    else if (lowerMsg === 'manpower') {
      const menu = await this.getMenuTree();
      responseText = 'Pilih informasi Manpower:';
      options = menu.sub.manpower.map(item => ({ label: item.label, value: item.query }));
    }
    else if (lowerMsg === 'report') {
      const menu = await this.getMenuTree();
      responseText = 'Pilih laporan yang ingin dibuka:';
      options = menu.sub.report.map(item => ({ label: item.label, value: item.path, type: 'navigate' }));
    }
    else if (lowerMsg === 'navigate') {
      const menu = await this.getMenuTree();
      responseText = 'Pilih halaman tujuan:';
      options = menu.sub.navigate.map(item => ({ label: item.label, value: item.path, type: 'navigate' }));
    }
    else if (lowerMsg === 'bantuan') {
      responseText = `Saya Feby, asisten AI produksi NextG. Saya bisa membantu:\n\n📊 Data real-time: NG, output, WIP, manpower\n🗺️ Navigasi ke halaman manapun\n📑 Akses laporan & analisa\n💬 Menjawab pertanyaan seputar produksi\n\nContoh pertanyaan:\n- "Total NG hari ini"\n- "Berapa WIP saat ini?"\n- "Defect rate hari ini"\n- "Navigasikan ke dashboard"`;
      options = [
        { label: '📊 Cek Data NG', value: 'ng' },
        { label: '📈 Cek Output', value: 'output' },
        { label: '🔄 Cek WIP', value: 'wip' },
        { label: '🗺️ Navigasi', value: 'navigate' },
      ];
    }
    // ===== DIRECT DYNAMIC QUERY HANDLERS =====
    else if ([
      'ng_cutting_pond', 'ng_check_panel', 'ng_qc',
      'total_ng_today', 'total_output_today', 'total_output_sewing_today',
      'total_output_cutting_entan_today', 'defect_rate_today',
      'wip_ops_count', 'wip_by_station',
      'manpower_today', 'attendance_by_station',
    ].includes(lowerMsg)) {
      responseText = await this.handleDynamicQuery(lowerMsg);
      options = [
        { label: '🏠 Menu Utama', value: 'menu_main' },
        { label: '🔄 Refresh Data', value: lowerMsg },
      ];
    }
    else {
      // Intent matching
      const intents = await this.prisma.aiIntent.findMany({ where: { isActive: true } });
      let matchedIntent: any = null;
      for (const intent of intents) {
        const keywords = intent.triggerKeywords as string[];
        if (keywords.some(kw => lowerMsg.includes(kw.toLowerCase()))) {
          matchedIntent = intent;
          break;
        }
      }

      // Natural language shortcuts for common queries
      if (!matchedIntent) {
        const naturalMappings: Array<{ keywords: string[]; query: string }> = [
          { keywords: ['ng hari ini', 'total ng', 'semua ng', 'berapa ng'], query: 'total_ng_today' },
          { keywords: ['output hari ini', 'total output', 'packing hari ini'], query: 'total_output_today' },
          { keywords: ['output sewing', 'sewing hari ini'], query: 'total_output_sewing_today' },
          { keywords: ['output cutting', 'cutting entan hari ini'], query: 'total_output_cutting_entan_today' },
          { keywords: ['wip', 'jumlah op', 'production order', 'berapa op'], query: 'wip_ops_count' },
          { keywords: ['wip station', 'wip per', 'distribusi wip'], query: 'wip_by_station' },
          { keywords: ['defect rate', 'defect hari ini', 'persentase ng', 'tingkat ng'], query: 'defect_rate_today' },
          { keywords: ['ng cp', 'ng check panel', 'check panel ng'], query: 'ng_check_panel' },
          { keywords: ['ng qc', 'quality control ng', 'qc hari ini'], query: 'ng_qc' },
          { keywords: ['ng pond', 'ng cutting pond', 'cutting pond ng'], query: 'ng_cutting_pond' },
          { keywords: ['manpower', 'kehadiran', 'hadir hari ini', 'berapa karyawan'], query: 'manpower_today' },
          { keywords: ['kehadiran per stasiun', 'manpower per', 'distribusi kehadiran'], query: 'attendance_by_station' },
        ];

        for (const mapping of naturalMappings) {
          if (mapping.keywords.some(kw => lowerMsg.includes(kw))) {
            responseText = await this.handleDynamicQuery(mapping.query);
            options = [
              { label: '🏠 Menu Utama', value: 'menu_main' },
              { label: '🔄 Refresh', value: mapping.query },
            ];
            break;
          }
        }

        if (!responseText) {
          const knowledge = await this.searchKnowledge(message);
          if (knowledge) {
            responseText = `Berdasarkan informasi yang saya simpan:\n\n${knowledge.content}`;
          } else {
            responseText = await this.callExternalAI(message);
          }
          options = [{ label: '🏠 Menu Utama', value: 'menu_main' }];
        }
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