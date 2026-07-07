import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ManpowerService } from '../manpower/manpower.service';

@Injectable()
export class IotService {
  constructor(
    private prisma: PrismaService,
    private manpower: ManpowerService,
  ) {}

  //////////////////////////////////////////////////////
  // REGISTER DEVICE (ESP pertama kali connect)
  //////////////////////////////////////////////////////
  async register(deviceId: string) {
    let device = await this.prisma.iotDevice.findUnique({
      where: { deviceId },
    });

    if (!device) {
      device = await this.prisma.iotDevice.create({
        data: {
          deviceId,
          name: deviceId,
          mode: 'COUNTER',
          station: 'CUTTING_POND',
          lineCode: 'K1YH',
          lastSeen: new Date(),
        },
      });

      console.log('🆕 NEW IOT DEVICE:', deviceId);
    } else {
      await this.prisma.iotDevice.update({
        where: { deviceId },
        data: { lastSeen: new Date() },
      });
    }

    return device;
  }

  //////////////////////////////////////////////////////
  // GET CONFIG UNTUK ESP (dipanggil tiap 2 detik)
  //////////////////////////////////////////////////////
  async getConfig(deviceId: string) {
    const device = await this.prisma.iotDevice.findUnique({
      where: { deviceId },
    });

    if (!device) {
      return { error: 'DEVICE_NOT_REGISTERED' };
    }

    await this.prisma.iotDevice.update({
      where: { deviceId },
      data: { lastSeen: new Date() },
    });

    return {
      deviceId: device.deviceId,
      mode: device.mode,
      station: device.station,
      line: device.lineCode,
      active: device.isActive,
    };
  }

  //////////////////////////////////////////////////////
  // MONITOR DASHBOARD
  //////////////////////////////////////////////////////
  async getAllDevices() {
    return this.prisma.iotDevice.findMany({
      orderBy: { deviceId: 'asc' },
    });
  }

  //////////////////////////////////////////////////////
  // UPDATE CONFIG DARI WEB ADMIN
  //////////////////////////////////////////////////////
  async updateDevice(deviceId: string, data: any) {
    return this.prisma.iotDevice.update({
      where: { deviceId },
      data,
    });
  }

  // ========== NEW CRUD METHODS ==========
  async getDeviceById(id: string) {
    const device = await this.prisma.iotDevice.findUnique({
      where: { id },
    });
    if (!device) throw new NotFoundException('Device not found');
    return device;
  }

  async createDevice(data: any) {
    // data: { deviceId, name, mode, station, lineCode, config, isActive }
    const existing = await this.prisma.iotDevice.findUnique({
      where: { deviceId: data.deviceId },
    });
    if (existing) throw new ConflictException('Device ID already exists');
    return this.prisma.iotDevice.create({
      data: {
        deviceId: data.deviceId,
        name: data.name || data.deviceId,
        mode: data.mode,
        station: data.station,
        lineCode: data.lineCode,
        config: data.config || null,
        isActive: data.isActive ?? true,
      },
    });
  }

  async updateDeviceById(id: string, data: any) {
    const existing = await this.prisma.iotDevice.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Device not found');
    // Prevent changing deviceId? Boleh diubah, tapi hati-hati. Biarkan.
    return this.prisma.iotDevice.update({
      where: { id },
      data: {
        name: data.name,
        mode: data.mode,
        station: data.station,
        lineCode: data.lineCode,
        config: data.config,
        isActive: data.isActive,
      },
    });
  }

  async deleteDeviceById(id: string) {
    const existing = await this.prisma.iotDevice.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Device not found');
    return this.prisma.iotDevice.delete({ where: { id } });
  }

  //////////////////////////////////////////////////////
  // DHRISTI CHECK-IN ABSENSI (sumber data = Employee Management)
  // Dipakai perangkat Dhristi Sewing (menu ke-2) untuk scan nametag karyawan.
  //////////////////////////////////////////////////////

  // Resolusi karyawan dari hasil scan nametag (isi QR = NIK).
  async resolveEmployeeForAttendance(code: string) {
    const nik = (code || '').trim();
    if (!nik) return { found: false, message: 'KODE KOSONG' };
    const emp = await this.prisma.employee.findUnique({ where: { nik } });
    if (!emp) return { found: false, nik, message: 'NIK TIDAK ADA' };
    return {
      found: true,
      nik: emp.nik,
      fullName: emp.fullName,
      lineCode: emp.lineCode,
      station: emp.station,
      jobTitle: emp.jobTitle,
      section: emp.section,
      department: emp.department,
    };
  }

  // Check-in absensi via Dhristi. Memakai ManpowerService.checkIn yang sama
  // dengan menu Manpower Control, sehingga data masuk & tampil di Manpower
  // Monitoring persis seperti input manual. line/station default dari master
  // karyawan (Employee Management), sama seperti auto-fill di Manpower Control.
  async deviceCheckIn(body: {
    deviceId?: string;
    nik: string;
    lineCode?: string;
    station?: string;
  }) {
    const nik = (body?.nik || '').trim();
    if (!nik) return { success: false, message: 'NIK KOSONG' };

    const emp = await this.prisma.employee.findUnique({ where: { nik } });
    if (!emp) return { success: false, message: 'NIK TIDAK ADA' };

    const lineCode = (body.lineCode && body.lineCode.trim()) || emp.lineCode;
    const station = (body.station && body.station.trim()) || emp.station;

    await this.manpower.checkIn({ nik: emp.nik, lineCode, station });

    return {
      success: true,
      message: 'OK',
      nik: emp.nik,
      fullName: emp.fullName,
      lineCode,
      station,
    };
  }

  // Check-out absensi via Dhristi. Memakai ManpowerService.checkOut yang sama
  // dengan menu Manpower Control. Menandai record absen aktif terakhir hari ini
  // sebagai check-out -> headcount aktif berkurang & target menyesuaikan.
  async deviceCheckOut(body: { deviceId?: string; nik: string }) {
    const nik = (body?.nik || '').trim();
    if (!nik) return { success: false, message: 'NIK KOSONG' };

    const emp = await this.prisma.employee.findUnique({ where: { nik } });
    if (!emp) return { success: false, message: 'NIK TIDAK ADA' };

    try {
      const att = await this.manpower.checkOut({ nik: emp.nik });
      return {
        success: true,
        message: 'OK',
        nik: emp.nik,
        fullName: emp.fullName,
        lineCode: att.lineCode,
        station: att.station,
      };
    } catch (e: any) {
      // mis. belum check-in hari ini
      return { success: false, message: (e?.message || 'GAGAL').toUpperCase() };
    }
  }
}