import { PrismaClient, Role, BloodGroup, RequestStatus, DonationStatus } from '@prisma/client';
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

  await seedShowcaseData(passwordHash);

  console.log('Seed complete. Demo accounts (password for all: %s):', DEMO_PASSWORD);
  console.log('  Admin    -', admin.email);
  console.log('  Hospital -', hospitalUser.email, '(pre-verified)');
  console.log('  Donor    -', donorUser.email, '(O_NEGATIVE, available)');
}

// Extra hospitals, donors, open requests and past donations so the public
// website has realistic content. Idempotent: users are upserted, and requests
// are only created for a hospital that has none yet.
const SHOWCASE_HOSPITALS = [
  { email: 'dmch@raktosheba.com', name: 'Dhaka Medical College Hospital', address: 'Bakshibazar, Dhaka', lat: 23.7257, lng: 90.3976 },
  { email: 'square@raktosheba.com', name: 'Square Hospital', address: 'Panthapath, Dhaka', lat: 23.7527, lng: 90.3815 },
  { email: 'ctg-medical@raktosheba.com', name: 'Chittagong Medical College Hospital', address: 'Panchlaish, Chattogram', lat: 22.3597, lng: 91.8317 },
];

const SHOWCASE_REQUESTS: { hospital: number; bloodGroup: BloodGroup; unitsNeeded: number; urgency: number }[] = [
  { hospital: 0, bloodGroup: BloodGroup.O_NEGATIVE, unitsNeeded: 3, urgency: 5 },
  { hospital: 1, bloodGroup: BloodGroup.AB_POSITIVE, unitsNeeded: 1, urgency: 4 },
  { hospital: 2, bloodGroup: BloodGroup.B_NEGATIVE, unitsNeeded: 2, urgency: 5 },
  { hospital: 0, bloodGroup: BloodGroup.A_POSITIVE, unitsNeeded: 2, urgency: 3 },
  { hospital: 1, bloodGroup: BloodGroup.O_POSITIVE, unitsNeeded: 4, urgency: 2 },
  { hospital: 2, bloodGroup: BloodGroup.A_NEGATIVE, unitsNeeded: 1, urgency: 3 },
];

const SHOWCASE_DONOR_GROUPS: BloodGroup[] = [
  BloodGroup.A_POSITIVE, BloodGroup.B_POSITIVE, BloodGroup.O_POSITIVE, BloodGroup.AB_POSITIVE,
  BloodGroup.A_NEGATIVE, BloodGroup.O_POSITIVE, BloodGroup.B_NEGATIVE, BloodGroup.O_NEGATIVE,
];

async function seedShowcaseData(passwordHash: string) {
  const hospitalUsers = [];

  for (const h of SHOWCASE_HOSPITALS) {
    const user = await prisma.user.upsert({
      where: { email: h.email },
      update: {},
      create: { email: h.email, passwordHash, role: Role.HOSPITAL },
    });
    await prisma.hospital.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, name: h.name, address: h.address, verified: true },
    });
    hospitalUsers.push({ user, ...h });
  }

  const donorProfiles = [];

  for (const [i, bloodGroup] of SHOWCASE_DONOR_GROUPS.entries()) {
    const email = `donor${i + 1}@raktosheba.com`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, passwordHash, role: Role.DONOR },
    });
    const profile = await prisma.donorProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        bloodGroup,
        isAvailable: i % 4 !== 3,
        lat: 23.75 + i * 0.01,
        lng: 90.38 + i * 0.01,
      },
    });
    donorProfiles.push(profile);
  }

  for (const [i, h] of hospitalUsers.entries()) {
    const existing = await prisma.bloodRequest.count({ where: { requesterId: h.user.id } });
    if (existing > 0) continue;

    for (const r of SHOWCASE_REQUESTS.filter((req) => req.hospital === i)) {
      await prisma.bloodRequest.create({
        data: {
          requesterId: h.user.id,
          bloodGroup: r.bloodGroup,
          unitsNeeded: r.unitsNeeded,
          urgency: r.urgency,
          status: RequestStatus.VERIFIED,
          lat: h.lat,
          lng: h.lng,
        },
      });
    }

    // Two fulfilled requests per hospital, each with a completed donation.
    for (const donor of donorProfiles.slice(i * 2, i * 2 + 2)) {
      const completedAt = new Date(Date.now() - (120 + i * 10) * 24 * 60 * 60 * 1000);
      await prisma.bloodRequest.create({
        data: {
          requesterId: h.user.id,
          bloodGroup: donor.bloodGroup,
          unitsNeeded: 1,
          status: RequestStatus.FULFILLED,
          lat: h.lat,
          lng: h.lng,
          createdAt: completedAt,
          donation: {
            create: { donorId: donor.id, scheduledAt: completedAt, completedAt, status: DonationStatus.COMPLETED },
          },
        },
      });
      await prisma.donorProfile.update({ where: { id: donor.id }, data: { lastDonationAt: completedAt } });
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
