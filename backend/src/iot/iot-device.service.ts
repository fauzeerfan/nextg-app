import { Injectable } from '@nestjs/common';
import { StationCode } from '@prisma/client';

export interface PondPattern {
  index: number;
  name: string;
  target: number;    // qtyEntan
  good: number;       // jumlah GOOD
  ng: number;         // jumlah NG
  current: number;    // total processed (good+ng)
  completed: boolean;
}

export interface PondOp {
  id: string;
  opNumber: string;
  style: string;
  qtyEntan: number;
  qtyPond: number;
  multiplier: number;
  patterns: PondPattern[];
}

export interface DeviceSession {
  deviceId: string;
  station: StationCode;
  line: string;
  // Pond specific
  pondState?: 'SELECT_OP' | 'SELECT_PATTERN' | 'CONFIRM_PATTERN' | 'COUNTING';
  pondOps?: PondOp[];
  pondOpIndex?: number;
  pondPatternIndex?: number;
  pondConfirmChoice?: 'YES' | 'BACK';
  // Sewing specific (can be extended)
  sewingOps?: any[];
  sewingOpIndex?: number;
}

@Injectable()
export class IotDeviceService {
  private sessions = new Map<string, DeviceSession>();

  getSession(deviceId: string): DeviceSession | undefined {
    return this.sessions.get(deviceId);
  }

  setSession(deviceId: string, session: DeviceSession) {
    this.sessions.set(deviceId, session);
  }

  updateSession(deviceId: string, updates: Partial<DeviceSession>) {
    const session = this.sessions.get(deviceId);
    if (session) {
      Object.assign(session, updates);
    }
  }

  removeSession(deviceId: string) {
    this.sessions.delete(deviceId);
  }
}