// backend/prisma/seed.ts
import { PrismaClient, StationCode } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

// ===== MENU IDS (sesuai dengan Sidebar.tsx) =====
const ALL_MENU_IDS = [
  'dashboard',
  'cutting_entan', 'cutting_pond', 'cp', 'sewing', 'qc', 'packing', 'fg',
  'target_monitoring', 'manpower_monitoring', 'login_monitoring',
  'manpower_control',
  'reports', 'traceability',
  'line_master', 'user_management', 'employee_management',
  'target_management', 'device_management', 'ai_management'
]

const MANAGER_MENU_IDS = [
  'dashboard',
  'cutting_entan', 'cutting_pond', 'cp', 'sewing', 'qc', 'packing', 'fg',
  'target_monitoring', 'manpower_monitoring', 'login_monitoring',
  'manpower_control',
  'reports', 'traceability'
]

// Operator menu berdasarkan station
const getOperatorMenu = (station: string) => {
  const stationToMenu: Record<string, string> = {
    'CUTTING_ENTAN': 'cutting_entan',
    'CUTTING_POND': 'cutting_pond',
    'CP': 'cp',
    'SEWING': 'sewing',
    'QC': 'qc',
    'PACKING': 'packing',
    'FG': 'fg'
  }
  const menuId = stationToMenu[station]
  return ['dashboard', menuId].filter(Boolean)
}

async function main() {
  console.log('🌱 INDUSTRIAL SEED START...')

  // ================================
  // PASSWORD HASHES
  // ================================
  const adminPass = await bcrypt.hash('admin123', 10)
  const entanPass = await bcrypt.hash('entan123', 10)
  const pondPass = await bcrypt.hash('pond123', 10)
  const panelPass = await bcrypt.hash('panel123', 10)
  const sewingPass = await bcrypt.hash('sewing123', 10)
  const qualityPass = await bcrypt.hash('quality123', 10)
  const packingPass = await bcrypt.hash('packing123', 10)
  const goodsPass = await bcrypt.hash('goods123', 10)

  // ================================
  // USERS
  // ================================
  // Administrator (all access)
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      allowedStations: ['CUTTING_ENTAN', 'CUTTING_POND', 'CP', 'SEWING', 'QC', 'PACKING', 'FG'],
      allowedMenus: ALL_MENU_IDS,
      department: 'SDC',
      jobTitle: 'MGR',
      lineCode: 'ALL',
      isActive: true
    },
    create: {
      username: 'admin',
      password: adminPass,
      fullName: 'Administrator',
      role: 'ADMINISTRATOR',
      allowedStations: ['CUTTING_ENTAN', 'CUTTING_POND', 'CP', 'SEWING', 'QC', 'PACKING', 'FG'],
      allowedMenus: ALL_MENU_IDS,
      department: 'SDC',
      jobTitle: 'MGR',
      lineCode: 'ALL',
      isActive: true
    }
  })
  console.log('👤 Admin created/updated')

  // Manager (all production menus, no master data)
  await prisma.user.upsert({
    where: { username: 'manager' },
    update: {
      allowedStations: ['CUTTING_ENTAN', 'CUTTING_POND', 'CP', 'SEWING', 'QC', 'PACKING', 'FG'],
      allowedMenus: MANAGER_MENU_IDS,
      department: 'PROD',
      jobTitle: 'MGR',
      lineCode: 'ALL',
      isActive: true
    },
    create: {
      username: 'manager',
      password: adminPass,
      fullName: 'Production Manager',
      role: 'MANAGER',
      allowedStations: ['CUTTING_ENTAN', 'CUTTING_POND', 'CP', 'SEWING', 'QC', 'PACKING', 'FG'],
      allowedMenus: MANAGER_MENU_IDS,
      department: 'PROD',
      jobTitle: 'MGR',
      lineCode: 'ALL',
      isActive: true
    }
  })
  console.log('👤 Manager created')

  // Operator Entan
  await prisma.user.upsert({
    where: { username: 'entan' },
    update: {
      allowedStations: ['CUTTING_ENTAN'],
      allowedMenus: getOperatorMenu('CUTTING_ENTAN'),
      department: 'PROD',
      jobTitle: 'OPR',
      lineCode: 'K1YH',
      isActive: true
    },
    create: {
      username: 'entan',
      password: entanPass,
      fullName: 'Operator Entan',
      role: 'OPERATOR',
      allowedStations: ['CUTTING_ENTAN'],
      allowedMenus: getOperatorMenu('CUTTING_ENTAN'),
      department: 'PROD',
      jobTitle: 'OPR',
      lineCode: 'K1YH',
      isActive: true
    }
  })
  console.log('👤 User entan created')

  // Operator Pond
  await prisma.user.upsert({
    where: { username: 'pond' },
    update: {
      allowedStations: ['CUTTING_POND'],
      allowedMenus: getOperatorMenu('CUTTING_POND'),
      department: 'PROD',
      jobTitle: 'OPR',
      lineCode: 'K1YH',
      isActive: true
    },
    create: {
      username: 'pond',
      password: pondPass,
      fullName: 'Operator Pond',
      role: 'OPERATOR',
      allowedStations: ['CUTTING_POND'],
      allowedMenus: getOperatorMenu('CUTTING_POND'),
      department: 'PROD',
      jobTitle: 'OPR',
      lineCode: 'K1YH',
      isActive: true
    }
  })
  console.log('👤 User pond created')

  // Operator Check Panel
  await prisma.user.upsert({
    where: { username: 'panel' },
    update: {
      allowedStations: ['CP'],
      allowedMenus: getOperatorMenu('CP'),
      department: 'PROD',
      jobTitle: 'OPR',
      lineCode: 'K1YH',
      isActive: true
    },
    create: {
      username: 'panel',
      password: panelPass,
      fullName: 'Operator Check Panel',
      role: 'OPERATOR',
      allowedStations: ['CP'],
      allowedMenus: getOperatorMenu('CP'),
      department: 'PROD',
      jobTitle: 'OPR',
      lineCode: 'K1YH',
      isActive: true
    }
  })
  console.log('👤 User panel created')

  // Operator Sewing
  await prisma.user.upsert({
    where: { username: 'sewing' },
    update: {
      allowedStations: ['SEWING'],
      allowedMenus: getOperatorMenu('SEWING'),
      department: 'PROD',
      jobTitle: 'OPR',
      lineCode: 'K1YH',
      isActive: true
    },
    create: {
      username: 'sewing',
      password: sewingPass,
      fullName: 'Operator Sewing',
      role: 'OPERATOR',
      allowedStations: ['SEWING'],
      allowedMenus: getOperatorMenu('SEWING'),
      department: 'PROD',
      jobTitle: 'OPR',
      lineCode: 'K1YH',
      isActive: true
    }
  })
  console.log('👤 User sewing created')

  // Operator Quality Control
  await prisma.user.upsert({
    where: { username: 'quality' },
    update: {
      allowedStations: ['QC'],
      allowedMenus: getOperatorMenu('QC'),
      department: 'QC',
      jobTitle: 'OPR',
      lineCode: 'K1YH',
      isActive: true
    },
    create: {
      username: 'quality',
      password: qualityPass,
      fullName: 'Operator QC',
      role: 'OPERATOR',
      allowedStations: ['QC'],
      allowedMenus: getOperatorMenu('QC'),
      department: 'QC',
      jobTitle: 'OPR',
      lineCode: 'K1YH',
      isActive: true
    }
  })
  console.log('👤 User quality created')

  // Operator Packing
  await prisma.user.upsert({
    where: { username: 'packing' },
    update: {
      allowedStations: ['PACKING'],
      allowedMenus: getOperatorMenu('PACKING'),
      department: 'PROD',
      jobTitle: 'OPR',
      lineCode: 'K1YH',
      isActive: true
    },
    create: {
      username: 'packing',
      password: packingPass,
      fullName: 'Operator Packing',
      role: 'OPERATOR',
      allowedStations: ['PACKING'],
      allowedMenus: getOperatorMenu('PACKING'),
      department: 'PROD',
      jobTitle: 'OPR',
      lineCode: 'K1YH',
      isActive: true
    }
  })
  console.log('👤 User packing created')

  // Operator Finished Goods
  await prisma.user.upsert({
    where: { username: 'goods' },
    update: {
      allowedStations: ['FG'],
      allowedMenus: getOperatorMenu('FG'),
      department: 'PROD',
      jobTitle: 'OPR',
      lineCode: 'K1YH',
      isActive: true
    },
    create: {
      username: 'goods',
      password: goodsPass,
      fullName: 'Operator Finished Goods',
      role: 'OPERATOR',
      allowedStations: ['FG'],
      allowedMenus: getOperatorMenu('FG'),
      department: 'PROD',
      jobTitle: 'OPR',
      lineCode: 'K1YH',
      isActive: true
    }
  })
  console.log('👤 User goods created')

  // ================================
  // IoT DEVICES
  // ================================
  const devices = [
    { deviceId: 'sparsha_pond_k1yh_001', mode: 'COUNTER', station: StationCode.CUTTING_POND, lineCode: 'K1YH' },
    { deviceId: 'dhristi_panel_k1yh_001', mode: 'SCANNER', station: StationCode.CP, lineCode: 'K1YH' },
    { deviceId: 'dhristi_sewing_k1yh_001', mode: 'SCANNER', station: StationCode.SEWING, lineCode: 'K1YH' },
    { deviceId: 'sparsha_sewingstart_k1yh_001', mode: 'COUNTER', station: StationCode.SEWING, lineCode: 'K1YH' },
    { deviceId: 'sparsha_sewingstart_k1yh_002', mode: 'COUNTER', station: StationCode.SEWING, lineCode: 'K1YH' },
    { deviceId: 'sparsha_sewingfinish_k1yh_001', mode: 'COUNTER', station: StationCode.SEWING, lineCode: 'K1YH' },
  ];
  for (const d of devices) {
    await prisma.iotDevice.upsert({
      where: { deviceId: d.deviceId },
      update: {},
      create: {
        deviceId: d.deviceId,
        name: d.deviceId,
        mode: d.mode,
        station: d.station,
        lineCode: d.lineCode,
      },
    });
  }
  console.log('📱 IoT Devices seeded')

  // ======================================================
  // LINE K1YH (4 POLA - FULL FLOW)
  // ======================================================
  const lineK1YH = await prisma.lineMaster.upsert({
    where: { code: 'K1YH' },
    update: {},
    create: {
      code: 'K1YH',
      name: 'LINE K1YH',
      description: 'Line K1YH - Cover Sewing',
      patternMultiplier: 4,
      stations: {
        create: [
          { station: StationCode.CUTTING_ENTAN, order: 1 },
          { station: StationCode.CUTTING_POND, order: 2 },
          { station: StationCode.CP, order: 3 },
          { station: StationCode.SEWING, order: 4 },
          { station: StationCode.QC, order: 5 },
          { station: StationCode.PACKING, order: 6 },
          { station: StationCode.FG, order: 7 },
        ]
      }
    }
  })
  console.log('🏭 Line K1YH created')

  // ======================================================
  // UPDATE KATEGORI NG UNTUK LINE K1YH
  // ======================================================
  await prisma.lineMaster.update({
    where: { code: 'K1YH' },
    data: {
      ngCategories: [ // CP
        'Garis', 'Lubang jarum/dekok', 'Bentol/jendol', 'Noda garis putih',
        'Noda titik putih/hitam', 'Emboss halus', 'Backing cloth', 'Bowing',
        'Shiwa', 'Cacat cutting dimensi', 'Cacat cutting kirikomi', 'Cacat cutting scrim tertarik'
      ],
      qcNgCategories: [ // QC
        'Jarak jahitan tidak standar', 'Bahan balap tidak standar', 'Point tidak center',
        'Lipatan tidak standar', 'Jahitan gelombang', 'Ex jarum', 'Benang over/keluar',
        'Bahan terlipat/terjahit', 'Tidak ada sutechi', 'Jahitan meleset', 'Sampah benang terjahit',
        'Kuncian putus/lepas', 'Part tidak terpasang', 'Part terbalik', 'Salah pasang',
        'Arah motif terbalik', 'Tidak ada piping', 'Benang pecah', 'Noda bahan',
        'Bekas marking', 'Cacat bahan', 'Langkah jahitan tidak standar', 'Jahitan putus',
        'Jahitan loncat', 'Benang kendor', 'Jahitan kencang', 'Slit over/tidak ada',
        'Jahitan keriput', 'Hole tidak ada/burry', 'Dimensi minus/over'
      ]
    }
  })
  console.log('✅ Kategori NG (CP dan QC) untuk line K1YH diupdate')

  // ======================================================
  // EMPLOYEE DATA (Manpower)
  // ======================================================
  const employees = [
    { nik: '2100590', fullName: 'John Wick', gender: 'Laki-laki', jobTitle: 'Operator', lineCode: 'K1YH', station: 'CUTTING_ENTAN', section: 'Cutting', department: 'PROD' },
    { nik: '2100591', fullName: 'James Bond', gender: 'Laki-laki', jobTitle: 'Operator', lineCode: 'K1YH', station: 'CUTTING_POND', section: 'Cutting', department: 'PROD' },
    { nik: '2100592', fullName: 'Ethan Hunt', gender: 'Laki-laki', jobTitle: 'Operator', lineCode: 'K1YH', station: 'CP', section: 'Quality', department: 'QC' },
    { nik: '2100593', fullName: 'Jason Bourne', gender: 'Laki-laki', jobTitle: 'Operator', lineCode: 'K1YH', station: 'SEWING', section: 'Sewing', department: 'PROD' },
    { nik: '2100594', fullName: 'Robert McCall', gender: 'Laki-laki', jobTitle: 'Operator', lineCode: 'K1YH', station: 'QC', section: 'Quality', department: 'QC' },
    { nik: '2100595', fullName: 'Frank Martin', gender: 'Laki-laki', jobTitle: 'Operator', lineCode: 'K1YH', station: 'PACKING', section: 'Packing', department: 'PROD' },
    { nik: '2100596', fullName: 'Hutch Mansell', gender: 'Laki-laki', jobTitle: 'Operator', lineCode: 'K1YH', station: 'FG', section: 'Warehouse', department: 'PPI' },
  ];

  for (const emp of employees) {
    await prisma.employee.upsert({
      where: { nik: emp.nik },
      update: emp,
      create: emp,
    });
  }
  console.log('👥 Employee data seeded (7 records)');

  // ======================================================
  // PATTERN MASTER (untuk K1YH, styleCode = K1YH)
  // ======================================================
  const patternParts = [
    { name: 'Pola 1', imgGood: 'k1yh_1_good.png', imgNg: 'k1yh_1_ng.png' },
    { name: 'Pola 2', imgGood: 'k1yh_2_good.png', imgNg: 'k1yh_2_ng.png' },
    { name: 'Pola 3', imgGood: 'k1yh_3_good.png', imgNg: 'k1yh_3_ng.png' },
    { name: 'Pola 4', imgGood: 'k1yh_4_good.png', imgNg: 'k1yh_4_ng.png' },
  ];

  await prisma.patternMaster.upsert({
    where: {
      styleCode_lineId: {
        styleCode: 'K1YH',
        lineId: lineK1YH.id,
      },
    },
    update: {
      parts: {
        deleteMany: {},
        create: patternParts,
      },
      imgSetGood: null,
      imgSetNg: null,
    },
    create: {
      styleCode: 'K1YH',
      lineId: lineK1YH.id,
      parts: {
        create: patternParts,
      },
      imgSetGood: null,
      imgSetNg: null,
    },
  });
  console.log('🎨 Pattern Master untuk K1YH (4 pola) dibuat dengan nama file gambar default');

  // ======================================================
  // TARGET SETTING (untuk 6 stasiun, efektif 2026-04-18)
  // ======================================================
  const effectiveDate = new Date(Date.UTC(2026, 3, 18)); // 2026-04-18 UTC
  const targetSettings = [
    { station: 'CUTTING_ENTAN', indexValue: 500, note: 'target cutting set' },
    { station: 'CUTTING_POND', indexValue: 400, note: 'target pola' },
    { station: 'CP', indexValue: 300, note: 'target inspeksi set' },
    { station: 'SEWING', indexValue: 125, note: 'target jahit set' },
    { station: 'QC', indexValue: 150, note: 'target final check set' },
    { station: 'PACKING', indexValue: 200, note: 'target packing set' },
  ];

  for (const ts of targetSettings) {
    await prisma.targetSetting.upsert({
      where: {
        lineCode_station_effectiveDate: {
          lineCode: 'K1YH',
          station: ts.station,
          effectiveDate: effectiveDate,
        },
      },
      update: {
        indexValue: ts.indexValue,
        note: ts.note,
        isActive: true,
      },
      create: {
        lineCode: 'K1YH',
        station: ts.station,
        indexValue: ts.indexValue,
        effectiveDate: effectiveDate,
        note: ts.note,
        isActive: true,
      },
    });
  }
  console.log('🎯 Target Setting untuk 6 stasiun (efektif 2026-04-18) dibuat');

  // ======================================================
  // SEWING CONFIGURATION untuk line K1YH
  // ======================================================
  const sewingConfig = {
    starts: [
      { id: 1, name: 'Start Jahit 1', patterns: [0, 1] },
      { id: 2, name: 'Start Jahit 2', patterns: [2, 3] },
    ],
    finishes: [
      { id: 1, name: 'Finish Akhir', inputStarts: [1, 2] },
    ],
  };

  await prisma.lineMaster.update({
    where: { code: 'K1YH' },
    data: { sewingConfig: sewingConfig },
  });
  console.log('🧵 Sewing Configuration untuk K1YH diisi');

  // ======================================================
  // PACKING CONFIGURATION untuk line K1YH
  // ======================================================
  await prisma.lineMaster.update({
    where: { code: 'K1YH' },
    data: { packingConfig: { packSize: 100 } },
  });
  console.log('📦 Packing Configuration untuk K1YH diisi (packSize = 100)');

  // ======================================================
  // AI ASSISTANT INTENTS (Feby)
  // ======================================================
  console.log('🤖 Seeding AI Intents for Feby...');

  // Hapus semua intent yang ada (bersihkan dulu)
  await prisma.aiIntent.deleteMany({});

  const aiIntents = [
    // Greeting / General
    {
      triggerKeywords: ['halo', 'hai', 'hello', 'hey', 'pagi', 'siang', 'sore', 'malam'],
      responseType: 'text',
      responseData: { text: 'Halo! Saya Feby, asisten AI Anda. Ada yang bisa saya bantu? Coba tanyakan tentang produksi, NG, output, atau minta report.' },
      isActive: true,
    },
    {
      triggerKeywords: ['terima kasih', 'thanks', 'thank you', 'makasih'],
      responseType: 'text',
      responseData: { text: 'Sama-sama! Senang bisa membantu. Ada lagi yang ingin ditanyakan?' },
      isActive: true,
    },
    {
      triggerKeywords: ['siapa kamu', 'kamu siapa', 'perkenalan'],
      responseType: 'text',
      responseData: { text: 'Saya Feby, asisten AI cerdas untuk sistem produksi NextG. Saya bisa menjawab pertanyaan seputar produksi, NG, output, dan membantu navigasi laporan.' },
      isActive: true,
    },

    // Dynamic Queries - NG
    {
      triggerKeywords: ['total ng hari ini', 'ng hari ini', 'jumlah ng hari ini', 'ng today'],
      responseType: 'dynamic',
      responseData: { query: 'total_ng_today' },
      isActive: true,
    },
    {
      triggerKeywords: ['total ng minggu ini', 'ng minggu ini'],
      responseType: 'dynamic',
      responseData: { query: 'total_ng_this_week' },
      isActive: true,
    },
    {
      triggerKeywords: ['total ng bulan ini', 'ng bulan ini'],
      responseType: 'dynamic',
      responseData: { query: 'total_ng_this_month' },
      isActive: true,
    },
    {
      triggerKeywords: ['ng per stasiun', 'ng per station', 'ng by station'],
      responseType: 'dynamic',
      responseData: { query: 'ng_by_station' },
      isActive: true,
    },

    // Dynamic Queries - Output
    {
      triggerKeywords: ['output hari ini', 'total output hari ini', 'produksi hari ini'],
      responseType: 'dynamic',
      responseData: { query: 'total_output_today' },
      isActive: true,
    },
    {
      triggerKeywords: ['output minggu ini', 'produksi minggu ini'],
      responseType: 'dynamic',
      responseData: { query: 'total_output_this_week' },
      isActive: true,
    },
    {
      triggerKeywords: ['output bulan ini', 'produksi bulan ini'],
      responseType: 'dynamic',
      responseData: { query: 'total_output_this_month' },
      isActive: true,
    },

    // Defect Rate
    {
      triggerKeywords: ['defect rate hari ini', 'defect rate', 'tingkat cacat hari ini'],
      responseType: 'dynamic',
      responseData: { query: 'defect_rate_today' },
      isActive: true,
    },
    {
      triggerKeywords: ['defect rate minggu ini', 'tingkat cacat minggu ini'],
      responseType: 'dynamic',
      responseData: { query: 'defect_rate_this_week' },
      isActive: true,
    },
    {
      triggerKeywords: ['defect rate bulan ini', 'tingkat cacat bulan ini'],
      responseType: 'dynamic',
      responseData: { query: 'defect_rate_this_month' },
      isActive: true,
    },

    // WIP
    {
      triggerKeywords: ['wip', 'jumlah wip', 'work in progress', 'berapa wip'],
      responseType: 'dynamic',
      responseData: { query: 'wip_ops_count' },
      isActive: true,
    },
    {
      triggerKeywords: ['wip per stasiun', 'wip per station'],
      responseType: 'dynamic',
      responseData: { query: 'wip_by_station' },
      isActive: true,
    },

    // Report Navigation
    {
      triggerKeywords: ['buatkan report ng', 'report ng', 'tampilkan report ng', 'laporan ng'],
      responseType: 'report',
      responseData: { reportType: 'ng-pond-cp', text: 'Membuka laporan NG (Pond & CP)...' },
      isActive: true,
    },
    {
      triggerKeywords: ['report ng quality control', 'report ng qc', 'laporan ng qc'],
      responseType: 'report',
      responseData: { reportType: 'ng-quality-control', text: 'Membuka laporan NG Quality Control...' },
      isActive: true,
    },
    {
      triggerKeywords: ['report cutting pond', 'laporan cutting pond'],
      responseType: 'report',
      responseData: { reportType: 'ng-cutting-pond', text: 'Membuka laporan Cutting Pond...' },
      isActive: true,
    },
    {
      triggerKeywords: ['report check panel', 'laporan check panel'],
      responseType: 'report',
      responseData: { reportType: 'ng-check-panel', text: 'Membuka laporan Check Panel...' },
      isActive: true,
    },

    // Navigation to pages
    {
      triggerKeywords: ['buka dashboard', 'tampilkan dashboard', 'ke dashboard'],
      responseType: 'navigate',
      responseData: { path: '/dashboard', text: 'Mengalihkan ke Dashboard...' },
      isActive: true,
    },
    {
      triggerKeywords: ['buka reports', 'tampilkan reports', 'ke halaman report'],
      responseType: 'navigate',
      responseData: { path: '/reports', text: 'Mengalihkan ke halaman Reports...' },
      isActive: true,
    },
    {
      triggerKeywords: ['buka traceability', 'tampilkan traceability', 'lacak produksi'],
      responseType: 'navigate',
      responseData: { path: '/traceability', text: 'Mengalihkan ke halaman Traceability...' },
      isActive: true,
    },
    {
      triggerKeywords: ['buka target monitoring', 'target monitoring'],
      responseType: 'navigate',
      responseData: { path: '/target-monitoring', text: 'Mengalihkan ke Target Monitoring...' },
      isActive: true,
    },
    {
      triggerKeywords: ['buka manpower monitoring', 'manpower monitoring'],
      responseType: 'navigate',
      responseData: { path: '/manpower-monitoring', text: 'Mengalihkan ke Manpower Monitoring...' },
      isActive: true,
    },
    {
      triggerKeywords: ['buka login monitoring', 'login monitoring'],
      responseType: 'navigate',
      responseData: { path: '/login-monitoring', text: 'Mengalihkan ke Login Monitoring...' },
      isActive: true,
    },
    {
      triggerKeywords: ['buka line master', 'line master'],
      responseType: 'navigate',
      responseData: { path: '/line-master', text: 'Mengalihkan ke Line Master...' },
      isActive: true,
    },
    {
      triggerKeywords: ['buka user management', 'user management'],
      responseType: 'navigate',
      responseData: { path: '/user-management', text: 'Mengalihkan ke User Management...' },
      isActive: true,
    },
    {
      triggerKeywords: ['buka employee management', 'employee management'],
      responseType: 'navigate',
      responseData: { path: '/employee-management', text: 'Mengalihkan ke Employee Management...' },
      isActive: true,
    },
    {
      triggerKeywords: ['buka target management', 'target management'],
      responseType: 'navigate',
      responseData: { path: '/target-management', text: 'Mengalihkan ke Target Management...' },
      isActive: true,
    },
    {
      triggerKeywords: ['buka device management', 'device management'],
      responseType: 'navigate',
      responseData: { path: '/device-management', text: 'Mengalihkan ke Device Management...' },
      isActive: true,
    },
    {
      triggerKeywords: ['buka ai management', 'ai management'],
      responseType: 'navigate',
      responseData: { path: '/ai-management', text: 'Mengalihkan ke AI Management...' },
      isActive: true,
    },

    // === TAMBAHAN INTENT BARU ===
    {
      triggerKeywords: ['ng cutting pond', 'ng pond', 'cutting pond ng', 'ng di cutting pond'],
      responseType: 'dynamic',
      responseData: { query: 'ng_cutting_pond' },
      isActive: true,
    },
    {
      triggerKeywords: ['ng check panel', 'ng cp', 'check panel ng', 'ng di check panel'],
      responseType: 'dynamic',
      responseData: { query: 'ng_check_panel' },
      isActive: true,
    },
    {
      triggerKeywords: ['ng quality control', 'ng qc', 'qc ng', 'ng di quality control', 'ng di qc'],
      responseType: 'dynamic',
      responseData: { query: 'ng_qc' },
      isActive: true,
    },
    {
      triggerKeywords: ['output sewing', 'sewing output', 'produksi sewing', 'hasil jahit'],
      responseType: 'dynamic',
      responseData: { query: 'total_output_sewing_today' },
      isActive: true,
    },
    {
      triggerKeywords: ['output cutting entan', 'entan output', 'produksi entan', 'hasil cutting entan'],
      responseType: 'dynamic',
      responseData: { query: 'total_output_cutting_entan_today' },
      isActive: true,
    },
    {
      triggerKeywords: ['wip per station', 'distribusi wip', 'wip per stasiun', 'sebaran wip'],
      responseType: 'dynamic',
      responseData: { query: 'wip_by_station' },
      isActive: true,
    },
  ];

  // Insert intents
  for (const intent of aiIntents) {
    await prisma.aiIntent.create({
      data: {
        triggerKeywords: intent.triggerKeywords,
        responseType: intent.responseType,
        responseData: intent.responseData,
        isActive: intent.isActive,
      },
    });
  }
  console.log(`🤖 ${aiIntents.length} AI Intents seeded for Feby`);

  console.log('✅ INDUSTRIAL SEED DONE')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })