import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Seeding for NextG App...');

  // --- 1. MASTER DATA (DEPT & JOB) ---
  const departments = [
    { code: 'SDC', name: 'Management System Development and Control' },
    { code: 'SLS', name: 'Sales' },
    { code: 'AUT', name: 'Production Automotive' },
    { code: 'CP',  name: 'Check Panel Dept' },
    { code: 'QC',  name: 'Quality Control Dept' },
  ];

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { code: dept.code },
      update: { name: dept.name },
      create: dept,
    });
  }

  const jobTitles = ['Director', 'Manager', 'Staff', 'Operator', 'Leader', 'Admin'];
  for (const title of jobTitles) {
    await prisma.jobTitle.upsert({ where: { name: title }, update: {}, create: { name: title } });
  }

  // --- 2. FEATURES & ROLES ---
  const features = [
    { id: 'dashboard', label: 'Dashboard', group: 'OVERVIEW' },
    { id: 'CUTTING', label: 'Cutting Station', group: 'PRODUCTION' },
    { id: 'CP', label: 'Check Panel', group: 'PRODUCTION' },
    { id: 'SEWING', label: 'Sewing Line', group: 'PRODUCTION' },
    { id: 'QC', label: 'Quality Control', group: 'PRODUCTION' },
    { id: 'PACKING', label: 'Packing', group: 'PRODUCTION' },
    { id: 'FG', label: 'Finished Goods', group: 'PRODUCTION' },
    { id: 'MR', label: 'Material Request', group: 'SUPPORTING' },
    { id: 'OPREQ', label: 'OP Pergantian', group: 'SUPPORTING' },
    { id: 'USER_MGMT', label: 'User Management', group: 'SYSTEM' },
    { id: 'ROLE_MGMT', label: 'Role Management', group: 'SYSTEM' },
  ];

  for (const f of features) {
    await prisma.feature.upsert({ where: { id: f.id }, update: { label: f.label, group: f.group }, create: f });
  }

  const adminRole = await prisma.role.upsert({
    where: { name: 'SUPER_ADMIN' },
    update: {},
    create: { name: 'SUPER_ADMIN', description: 'Full Access' },
  });

  await prisma.rolePermission.deleteMany({ where: { roleId: adminRole.id } });
  await prisma.rolePermission.createMany({
    data: features.map(f => ({ roleId: adminRole.id, featureId: f.id }))
  });

  // --- 3. SUPER USER ---
  const hashedPassword = await bcrypt.hash('password123', 10);
  await prisma.user.upsert({
    where: { username: 'irfan.fauzi' },
    update: { roleId: adminRole.id },
    create: {
      username: 'irfan.fauzi',
      password: hashedPassword,
      fullName: 'Irfan Fauzi',
      email: 'irfan@seikou.co.id',
      roleId: adminRole.id,
      isActive: true
    },
  });

  // --- 4. PRODUCTION DATA (MOCK) ---
  console.log('🏭 Seeding Production Orders...');
  
  // REVISED MOCK DATA: Menambahkan sewingOutQty agar valid untuk QC
  const ops = [
    // OP di Sewing (Sedang jalan)
    { 
        opNumber: 'OP-2025-001', style: 'TYT-SC-MOD-X', target: 1000, station: 'SEWING', 
        cut: 1000, cp: 950, sewIn: 200, sewOut: 50, qc: 0, packed: 0 
    },
    // OP Baru Mulai (Cutting)
    { 
        opNumber: 'OP-2025-002', style: 'HND-CV-ARM', target: 500, station: 'CUTTING', 
        cut: 100, cp: 0, sewIn: 0, sewOut: 0, qc: 0, packed: 0
    },
    // OP di QC (Sudah ada output sewing)
    { 
        opNumber: 'OP-2025-003', style: 'SUZ-ERT-GL', target: 2000, station: 'QC', 
        cut: 2000, cp: 2000, sewIn: 2000, sewOut: 2000, qc: 500, packed: 0
    },
  ];

  for (const op of ops) {
    await prisma.productionOrder.upsert({
      where: { opNumber: op.opNumber },
      update: {
        // Pastikan update data jika sudah ada
        sewingOutQty: op.sewOut,
        currentStation: op.station
      },
      create: {
        opNumber: op.opNumber,
        styleCode: op.style,
        targetQty: op.target,
        currentStation: op.station,
        cutQty: op.cut,
        cpGoodQty: op.cp,
        sewingInQty: op.sewIn,
        sewingOutQty: op.sewOut, // FIX: Data ini wajib > 0 agar muncul di QC
        qcGoodQty: op.qc || 0,
        packedQty: op.packed || 0,
        status: 'WIP'
      }
    });
  }

  console.log('✅ Seeding Completed! Database is ready.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });