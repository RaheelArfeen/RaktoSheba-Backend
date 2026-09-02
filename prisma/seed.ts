import { PrismaClient, Role, BloodGroup } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Demo@1234';

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@raktosheba.com' },
    update: {},
    create: {
      email: 'admin@raktosheba.com',
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const hospitalUser = await prisma.user.upsert({
    where: { email: 'hospital@raktosheba.com' },
    update: {},
    create: {
      email: 'hospital@raktosheba.com',
      passwordHash,
      role: Role.HOSPITAL,
    },
  });

  await prisma.hospital.upsert({
    where: { userId: hospitalUser.id },
    update: {},
    create: {
      userId: hospitalUser.id,
      name: 'RaktoSheba Demo Hospital',
      address: '1 Demo Street, Dhaka',
      verified: true,
    },
  });

  const donorUser = await prisma.user.upsert({
    where: { email: 'donor@raktosheba.com' },
    update: {},
    create: {
      email: 'donor@raktosheba.com',
      passwordHash,
      role: Role.DONOR,
    },
  });

  await prisma.donorProfile.upsert({
    where: { userId: donorUser.id },
    update: {},
    create: {
      userId: donorUser.id,
      bloodGroup: BloodGroup.O_NEGATIVE,
      isAvailable: true,
      lat: 23.8103,
      lng: 90.4125,
    },
  });

  console.log('Seed complete. Demo accounts (password for all: %s):', DEMO_PASSWORD);
  console.log('  Admin    -', admin.email);
  console.log('  Hospital -', hospitalUser.email, '(pre-verified)');
  console.log('  Donor    -', donorUser.email, '(O_NEGATIVE, available)');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
