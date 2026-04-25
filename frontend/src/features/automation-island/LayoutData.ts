export interface StationLayout {
  id: string;
  name: string;
  position: [number, number, number];
  color: string;
  description: string;
}

export type DeviceType = 'sparsha' | 'dhristi' | 'pc' | 'tablet' | 'scanner' | 'printer';

export interface IoTDeviceLayout {
  id: string;
  name: string;
  type: DeviceType;
  stationId: string;
  positionOffset: [number, number, number];
}

export const STATION_LAYOUTS: StationLayout[] = [
  {
    id: 'WAREHOUSE',
    name: 'Warehouse',
    position: [-18, 0, -1.5],
    color: '#6b7280',
    description: 'Penyimpanan material dan suplai ke Cutting Entan',
  },
  {
    id: 'CUTTING_ENTAN',
    name: 'Cutting Entan',
    position: [-12, 0, -1.5],
    color: '#f97316',
    description: 'Pemotongan kasar dan persiapan material',
  },
  {
    id: 'CUTTING_POND',
    name: 'Cutting Pond',
    position: [-8, 0, -1.5],
    color: '#f59e0b',
    description: 'Pemotongan presisi per pola',
  },
  {
    id: 'CP',
    name: 'Check Panel',
    position: [-4, 0, -1.5],
    color: '#10b981',
    description: 'Inspeksi visual per pola',
  },
  {
    id: 'SEWING',
    name: 'Sewing',
    position: [0, 0, -1.5],
    color: '#8b5cf6',
    description: 'Proses penjahitan dan perakitan',
  },
  {
    id: 'QC',
    name: 'Quality Control',
    position: [4, 0, -1.5],
    color: '#ef4444',
    description: 'Pemeriksaan kualitas akhir set',
  },
  {
    id: 'PACKING',
    name: 'Packing',
    position: [8, 0, -1.5],
    color: '#3b82f6',
    description: 'Pengemasan dan pembuatan box',
  },
  {
    id: 'FG',
    name: 'Finished Goods',
    position: [12, 0, -1.5],
    color: '#06b6d4',
    description: 'Penyimpanan barang jadi & siap kirim',
  },
];

// Mengatur Offset X (-0.7 dan 0.7) agar perangkat berdampingan rapi
export const IOT_DEVICE_LAYOUTS: IoTDeviceLayout[] = [
  // CUTTING ENTAN: PC & Printer
  { id: 'dev_ent_pc', name: 'Komputer Utama', type: 'pc', stationId: 'CUTTING_ENTAN', positionOffset: [-0.7, 1.2, 1.8] },
  { id: 'dev_ent_prt', name: 'Printer Label', type: 'printer', stationId: 'CUTTING_ENTAN', positionOffset: [0.7, 1.2, 1.8] },

  // CUTTING POND: Sparsha (Tetap 1)
  { id: 'dev_pnd_01', name: 'Sparsha IoT Device', type: 'sparsha', stationId: 'CUTTING_POND', positionOffset: [0, 1.2, 1.8] },

  // CHECK PANEL: Dhristi & Sparsha
  { id: 'dev_cp_dhr', name: 'Dhristi Cam IoT', type: 'dhristi', stationId: 'CP', positionOffset: [-0.7, 1.2, 1.8] },
  { id: 'dev_cp_spr', name: 'Sparsha Sensor IoT', type: 'sparsha', stationId: 'CP', positionOffset: [0.7, 1.2, 1.8] },

  // SEWING: Dhristi & Sparsha
  { id: 'dev_sew_dhr', name: 'Dhristi Vision', type: 'dhristi', stationId: 'SEWING', positionOffset: [-0.7, 1.2, 1.8] },
  { id: 'dev_sew_spr', name: 'Sparsha Sewing', type: 'sparsha', stationId: 'SEWING', positionOffset: [0.7, 1.2, 1.8] },

  // QUALITY CONTROL: Tablet (Tetap 1)
  { id: 'dev_qc_01', name: 'QC Tablet Mobile', type: 'tablet', stationId: 'QC', positionOffset: [0, 1.2, 1.8] },

  // PACKING: PC & Printer
  { id: 'dev_pck_pc', name: 'Packing Station PC', type: 'pc', stationId: 'PACKING', positionOffset: [-0.7, 1.2, 1.8] },
  { id: 'dev_pck_prt', name: 'Printer Barcode', type: 'printer', stationId: 'PACKING', positionOffset: [0.7, 1.2, 1.8] },

  // FINISHED GOODS: PC & Scanner
  { id: 'dev_fg_pc', name: 'FG Admin PC', type: 'pc', stationId: 'FG', positionOffset: [-0.7, 1.2, 1.8] },
  { id: 'dev_fg_scn', name: 'Barcode Scanner', type: 'scanner', stationId: 'FG', positionOffset: [0.7, 1.2, 1.8] },
];