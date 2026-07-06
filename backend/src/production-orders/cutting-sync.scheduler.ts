import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ProductionOrdersService } from './production-orders.service';
import { SettingsService } from '../settings/settings.service';

/**
 * CuttingSyncScheduler
 * --------------------
 * Menjalankan sinkronisasi data Cutting (qtyEntan) dari API eksternal secara
 * TERPUSAT di backend, sehingga setiap layar frontend cukup membaca DB dan tidak
 * perlu memicu sync sendiri-sendiri.
 *
 * Desain agar aman & tidak menimbulkan error:
 *  - Tanpa dependency tambahan: hanya memakai setInterval + lifecycle NestJS.
 *  - Memakai ulang logika yang sudah teruji: ProductionOrdersService.syncExternalData().
 *  - Anti tumpang-tindih: guard `running` mencegah siklus baru jalan sebelum
 *    siklus sebelumnya selesai (mis. saat API eksternal lambat).
 *  - Anti-crash: semua error ditangkap & dicatat; proses backend tetap berjalan.
 *  - Dapat diatur via environment variable:
 *      CUTTING_SYNC_INTERVAL_MS  -> jeda antar sync (default 15000 ms)
 *      CUTTING_SYNC_DISABLED=true -> matikan auto-sync tanpa mengubah kode
 */
@Injectable()
export class CuttingSyncScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('CuttingSyncScheduler');
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  private readonly intervalMs =
    Number(process.env.CUTTING_SYNC_INTERVAL_MS) || 15000;

  constructor(
    private readonly productionOrders: ProductionOrdersService,
    private readonly settings: SettingsService,
  ) {}

  onModuleInit(): void {
    // Kill-switch keras lewat ENV (mematikan timer sepenuhnya).
    if (process.env.CUTTING_SYNC_DISABLED === 'true') {
      this.logger.warn(
        'Auto-sync Cutting API dimatikan paksa (CUTTING_SYNC_DISABLED=true).',
      );
      return;
    }

    // Timer tetap berjalan; tiap tick menghormati switch runtime CUTTING_SOURCE.
    // Dengan begitu, beralih ke EXTERNAL via tombol UI langsung aktif tanpa restart.
    this.logger.log(
      `Auto-sync Cutting API standby (tiap ${this.intervalMs} ms; aktif hanya saat CUTTING_SOURCE=EXTERNAL).`,
    );

    void this.runSafe();
    this.timer = setInterval(() => void this.runSafe(), this.intervalMs);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Membungkus syncExternalData() agar:
   *  - tidak tumpang-tindih (jika siklus sebelumnya belum selesai), dan
   *  - tidak pernah melempar error keluar (proses tetap hidup).
   */
  private async runSafe(): Promise<void> {
    if (this.running) {
      return; // siklus sebelumnya masih berjalan -> lewati siklus ini
    }
    this.running = true;
    try {
      // Lewati cepat tanpa fetch eksternal bila sumber data = INTERNAL.
      const source = await this.settings.getCuttingSource();
      if (source !== 'EXTERNAL') {
        return; // blok finally akan mereset flag `running`
      }
      const result = await this.productionOrders.syncExternalData();
      this.logger.debug(`Sync OK (${result?.total ?? 0} OP diproses).`);
    } catch (err: any) {
      // Jangan crash; cukup catat dan coba lagi pada siklus berikutnya.
      this.logger.warn(`Sync gagal: ${err?.message ?? err}`);
    } finally {
      this.running = false;
    }
  }
}