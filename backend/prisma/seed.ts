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
    { deviceId: 'sparsha_sewingfinish_k1yh_002', mode: 'COUNTER', station: StationCode.SEWING, lineCode: 'K1YH' },
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
  // LINE K1YH (4 POLA - FULL FLOW) - HANYA LINE, TANPA PATTERN
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

  // Tidak membuat pattern master untuk K1YH (akan dibuat manual via UI)
  // ======================================================
  // LINE K0WL dihilangkan
  // ======================================================

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