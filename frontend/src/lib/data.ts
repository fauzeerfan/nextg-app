import type { ProductionOrder, FgStock, AlertItem, NgReason, MaterialRequest, OpReplacement, UserData, RoleData } from '../types/production';

// --- DYNAMIC DATA (Fetched from API) ---
// Diinisialisasi kosong karena data asli akan dimuat dari Database via API
export const INITIAL_ORDERS: ProductionOrder[] = [];
export const INITIAL_FG_STOCK: FgStock[] = [];
export const SYSTEM_ALERTS: AlertItem[] = [];
export const INITIAL_MR_LIST: MaterialRequest[] = [];
export const INITIAL_OP_REPLACEMENTS: OpReplacement[] = [];
export const INITIAL_USERS: UserData[] = [];
export const INITIAL_ROLES: RoleData[] = [];

// --- STATIC CONFIGURATION (Master Data Local) ---

// Daftar Alasan Defect untuk Dropdown QC/CP
export const NG_REASONS: NgReason[] = [
  { id: 'NG01', category: 'MATERIAL', label: 'Fabric Defect / Hole' },
  { id: 'NG02', category: 'MATERIAL', label: 'Color Mismatch' },
  { id: 'NG03', category: 'PROCESS', label: 'Cutting Misalignment' },
  { id: 'NG04', category: 'PROCESS', label: 'Dirty / Stain' },
  { id: 'NG05', category: 'PROCESS', label: 'Sewing Skip Stitch' },
  { id: 'NG06', category: 'PROCESS', label: 'Sewing Puckering' },
];

// Konfigurasi Pola per Style (Fallback jika API Master Data belum di-set)
export const STYLE_PATTERNS: Record<string, string[]> = {
  'K1YH': ['Pola A (Sandaran)', 'Pola B (Dudukan)', 'Pola C (Sayap Kiri)', 'Pola D (Sayap Kanan)'],
  'DEFAULT': ['Main Body', 'Accessories']
};