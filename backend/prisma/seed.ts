import { PrismaClient, StationCode } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

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
  // Nama file gambar default (sesuai konvensi frontend)
  // Simpan di folder: backend/uploads/patterns/
  // Contoh: k1yh_1_good.png, k1yh_1_ng.png, dst.
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
      imgSetGood: null,   // biarkan null, bisa diupload via UI
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