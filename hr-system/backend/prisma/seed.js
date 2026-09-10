require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  await prisma.systemSettings.upsert({
    where: { id: 'SETTINGS' },
    create: {},
    update: {},
  });

  const leaveTypes = [
    { name: 'Casual', entitlementPermanent: 10, entitlementTemporary: 5 },
    { name: 'Sick', entitlementPermanent: 14, entitlementTemporary: 7 },
    { name: 'Earned/Annual', entitlementPermanent: 15, entitlementTemporary: 0 },
  ];
  for (const lt of leaveTypes) {
    await prisma.leaveType.upsert({ where: { name: lt.name }, create: lt, update: lt });
  }

  const allowanceTypes = ['House Rent', 'Medical', 'Transport'];
  for (const name of allowanceTypes) {
    await prisma.allowanceType.upsert({ where: { name }, create: { name }, update: {} });
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@rahmania.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.user.create({ data: { email: adminEmail, passwordHash, role: 'HR_ADMIN' } });
    console.log(`Created HR/Admin login: ${adminEmail} / ${adminPassword} (change this password after first login)`);
  }

  console.log('Seed complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
