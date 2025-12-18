// ==========================================
// 1. GLOBAL SYSTEM TYPES
// ==========================================

export type Theme = 'light' | 'dark' | 'system';

export type StationCode = 
  | 'CUTTING' 
  | 'CP' 
  | 'SEWING' 
  | 'QC' 
  | 'PACKING' 
  | 'FG' 
  | 'MR' 
  | 'OPREQ' 
  | 'USER_MGMT' 
  | 'ROLE_MGMT' 
  | 'PPC' 
  | 'MASTER_OP';

// ==========================================
// 2. CORE PRODUCTION (ALIGNED WITH PRISMA)
// ==========================================

export interface ProductionOrder {
  id: string;            
  opNumber: string;      
  styleCode: string;
  buyer?: string;     
  targetQty: number;     
  completedQty: number;  
  status: string;        // SCHEDULED, WIP, COMPLETED, HOLD, CLOSED_FG
  currentStation: string; 
  
  // Optional QR Code (Generated at Cutting)
  qrCode?: string; 

  // Real-time Balances
  cutQty: number;        
  cpGoodQty: number;     
  sewingInQty: number;   
  sewingOutQty: number;  
  qcGoodQty: number;     
  packedQty: number;     
  
  // Legacy/Optional fields (Computed on Frontend)
  progress_pct?: number; 
  last_sync_timestamp?: string;
}

export type OpStatus = 'SCHEDULED' | 'WIP' | 'COMPLETED' | 'HOLD' | 'CLOSED_FG'; 

// ==========================================
// 3. MASTER DATA (PATTERN CONFIG)
// ==========================================

export interface PatternPart {
  name: string;    
  imgGood: string; 
  imgNg: string;   
}

export interface PatternMaster {
  id: string;
  styleCode: string;   
  patterns: PatternPart[]; 
  
  // NEW: Set Images
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
  styleCode: string;       
  customerPartNo: string;  
  totalStock: number;      
  totalBoxes: number;      
  todayIn: number;         
  todayOut: number;        
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
// 7. LEGACY / HELPER TYPES (Optional)
// ==========================================

export interface CuttingBatch {
  id: string;
  timestamp: string;
  lay_no: string;
  qty_cut: number;
  good: number;
  ng: number;
  ng_reason?: string;
  operator: string;
}

export interface PendingBundle {
  id: string;
  qty: number;
  scan_time: string;
  status: 'pending';
}

export interface QcQueueItem {
  id: string;
  qty: number;
  time: string;
  status: 'queue';
}