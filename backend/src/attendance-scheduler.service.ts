import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ManpowerService } from './manpower/manpower.service';

/**
 * Scheduler harian TANPA dependensi eksternal.
 *
 * Sengaja tidak memakai @nestjs/schedule agar tidak perlu menambah paket &
 * menjalankan `npm install` di server produksi. Memakai setTimeout yang
 * menjadwalkan ulang dirinya sendiri untuk berjalan setiap hari pada jam target
 * (default 07:30 waktu server). Jam kerja 07:30-16:15 dengan istirahat
 * 11:30-12:15 hanya informasi (tidak memengaruhi logika ini).
 *
 * Jam/menit dapat dioverride lewat env AUTO_CHECKIN_HOUR / AUTO_CHECKIN_MINUTE.
 * Set AUTO_CHECKIN_DISABLED=1 untuk mematikan penjadwalan otomatis.
 */
@Injectable()
export class AttendanceSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AttendanceSchedulerService.name);
  private timer: NodeJS.Timeout | null = null;

  private readonly hour = Number(process.env.AUTO_CHECKIN_HOUR ?? 7);
  private readonly minute = Number(process.env.AUTO_CHECKIN_MINUTE ?? 30);
  private readonly disabled = process.env.AUTO_CHECKIN_DISABLED === '1';

  constructor(private readonly manpower: ManpowerService) {}

  onModuleInit() {
    if (this.disabled) {
      this.logger.warn('Auto check-in scheduler DINONAKTIFKAN (AUTO_CHECKIN_DISABLED=1)');
      return;
    }
    this.scheduleNext();
  }

  onModuleDestroy() {
    if (this.timer) clearTimeout(this.timer);
  }

  private msUntilNextRun(): number {
    const now = new Date();
    const next = new Date(now);
    next.setHours(this.hour, this.minute, 0, 0);
    if (next.getTime() <= now.getTime()) {
      next.setDate(next.getDate() + 1);
    }
    return next.getTime() - now.getTime();
  }

  private scheduleNext() {
    if (this.timer) clearTimeout(this.timer);
    const delay = this.msUntilNextRun();
    const hh = String(this.hour).padStart(2, '0');
    const mm = String(this.minute).padStart(2, '0');
    this.logger.log(
      `Auto check-in non-sewing dijadwalkan dalam ~${Math.round(delay / 60000)} menit (target ${hh}:${mm} waktu server)`,
    );
    this.timer = setTimeout(async () => {
      try {
        const res = await this.manpower.autoCheckInNonSewing();
        this.logger.log(`Auto check-in selesai: ${JSON.stringify(res)}`);
      } catch (e: any) {
        this.logger.error(`Auto check-in gagal: ${e?.message ?? e}`);
      } finally {
        this.scheduleNext(); // jadwalkan untuk hari berikutnya
      }
    }, delay);
    // Jangan menahan event loop agar proses tetap bisa keluar normal.
    if (this.timer && typeof this.timer.unref === 'function') this.timer.unref();
  }
}