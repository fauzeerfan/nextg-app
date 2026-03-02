// ==========================================
// 1. GLOBAL SYSTEM TYPES
// ==========================================

export type Theme = 'light' | 'dark' | 'system';

export type StationCode =
  | 'CUTTING_ENTAN'
  | 'CUTTING_POND'
  | 'CP'
  | 'SEWING'
  | 'QC'
  | 'PACKING'
  | 'FG'
  | 'USER_MGMT'
  | 'ROLE_MGMT'
  | 'MASTER_OP'
  | 'LINE_MASTER';

// ==========================================
// 2. CORE PRODUCTION (ALIGNED WITH PRISMA)
// ==========================================

export interface PatternProgress {
  index: number;
  name: string;
  target: number;
  good: number;
  ng: number;
  current: number;
  completed: boolean;
}

export interface ProductionOrder {
  id: string;
  opNumber: string;
  styleCode: string;
  itemNumberFG: string;      // dari schema
  itemNameFG?: string;       // dari schema
  qtyOp: number;             // target quantity OP

  // Cutting quantities
  qtyEntan: number;          // total cut from external API
  qtySentToPond: number;     // total sent to Pond (sum of batches)
  qtyPond: number;           // actual pieces counted by Sparsha Pond
  qtyPondNg?: number;        // not good pieces in Pond

  // Check Panel quantities
  qtyCP: number;             // total masuk CP (good + ng)
  cpGoodQty: number;         // good after Check Panel
  cpNgQty: number;           // ng after Check Panel
  allPatternsCompleted?: boolean;

  // Sewing quantities
  qtySewingIn: number;       // input to Sewing (start)
  qtySewingOut: number;      // output from Sewing (finish)

  // Quality Control quantities
  qtyQC: number;             // good after QC
  qcNgQty: number;           // ng after QC

  // Packing & Finished Goods
  qtyPacking: number;        // packed quantity
  qtyFG: number;             // finished goods stock in

  status: string;            // WIP, DONE, HOLD
  currentStation: StationCode | string; // current station code

  // Optional QR Code (generated at Cutting Entan)
  qrCode?: string;
  qrCodePacking?: string;    // untuk packing

  // Per‑pattern progress (for Cutting Pond only)
  patterns?: PatternProgress[];

  // Metadata
  createdAt?: string;
  updatedAt?: string;

  // Computed fields (optional, for UI)
  progress_pct?: number;
  last_sync_timestamp?: string;

  lineCode?: string;                // tambah
  setsReadyForSewing?: number;      // tambah
}

export type OpStatus = 'SCHEDULED' | 'WIP' | 'COMPLETED' | 'HOLD' | 'CLOSED_FG';

// ==========================================
// 3. MASTER DATA (PATTERN CONFIG)
// ==========================================

export interface PatternPart {
  name: string;    // Nama Pola (e.g. Sandaran)
  imgGood: string; // Filename (e.g. k1yh_1_good.png)
  imgNg: string;   // Filename (e.g. k1yh_1_ng.png)
}

export interface PatternMaster {
  id: string;
  styleCode: string;       // Key: K1YH (First 4 chars of OP)
  patterns: PatternPart[]; // Array of Objects with Images

  // Set Images (Global/Full View for QC)
  imgSetGood?: string;
  imgSetNg?: string;

  createdAt?: string;
  updatedAt?: string;
}

// ==========================================
// 4. USER & SYSTEM MANAGEMENT
// ==========================================

export interface UserData {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: string;
  roleId?: string;
  department: string;
  departmentId?: string;
  jobTitle: string;
  jobTitleId?: string;
  status: 'ACTIVE' | 'INACTIVE';
  lastLogin: string;
  avatarSeed: string;
  lineCode?: string;
  allowedStations?: string[];
}

export interface RoleData {
  id: string;
  name: string;
  description: string;
  userCount: number;
  permissions: string[];
}

export interface DepartmentData {
  id: string;
  code: string;
  name: string;
}

export interface JobTitleData {
  id: string;
  name: string;
}

// ==========================================
// 5. SUPPORTING FLOW (NG HANDLERS)
// ==========================================

export interface MaterialRequest {
  id: string; // reqNo
  req_date: string;
  op_number: string;
  part_name: string;
  qty_needed: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUPPLIED';
  requester: string;
}

export interface OpReplacement {
  id: string; // reqNo
  req_date: string;
  original_op: string;
  new_op_identity: string;
  qty: number;
  reason_ng: string;
  status: 'DRAFT' | 'SUBMITTED' | 'PPIC_APPROVED' | 'RELEASED' | 'REJECTED';
  qc_inspector: string;
}

export interface NgReason {
  id: string;
  category: 'MATERIAL' | 'PROCESS' | 'MACHINE';
  label: string;
}

// ==========================================
// 6. INVENTORY & ALERTS
// ==========================================

export interface FgStock {
  id: string;
  fgNumber: string;
  styleCode: string;
  description?: string;
  totalStock: number;
  totalBoxes: number;
  availableStock: number;
  warehouse: string;
  shelfLocation?: string;
  lastUpdated: string;
}

export interface FgStockItem {
  id: string;
  fgId: string;
  opId: string;
  opNumber?: string;
  qty: number;
  createdAt: string;
}

export interface Shipment {
  id: string;
  shippingNo: string;
  shippingDate: string;
  customerName?: string;
  fgNumber: string;
  styleCode: string;
  qty: number;
  status: 'DRAFT' | 'SHIPPED' | 'DELIVERED';
  createdBy?: string;
  items?: ShipmentItem[];
}

export interface ShipmentItem {
  id: string;
  shipmentId: string;
  opId: string;
  opNumber?: string;
  qty: number;
}

export interface FgScanEvent {
  time: string;
  status: 'OK' | 'ERROR';
  message: string;
  box_id?: string;
}

export interface AlertItem {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  station_code: StationCode;
  timestamp: string;
}

// ==========================================
// 7. CUTTING BATCH
// ==========================================

export interface CuttingBatch {
  id: string;
  batchNumber: number;
  qty: number;
  qrCode: string;
  createdAt: string;
  printed: boolean;
  opNumber?: string;
  itemNumberFG?: string;
}

// ==========================================
// 8. LINE MASTER
// ==========================================

export interface LineStation {
  code: string;
  name: string;
  required: boolean;
  deviceType: string;
}

export interface LineMaster {
  id: string;
  code: string;
  name: string;
  description?: string;
  patternMultiplier: number;
  stations: LineStation[];
  createdAt: string;
  updatedAt: string;
  userCount?: number;
  productionOrders?: ProductionOrder[];
}