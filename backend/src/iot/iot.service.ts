import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IotService {
  constructor(private prisma: PrismaService) {}

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
}