import { BloodGroup, DonationStatus, Prisma, RequestStatus, Role, VerificationStatus } from '@prisma/client';
import prisma from '../../../config/prisma';
import AppError from '../../utils/AppError';
import { parsePagination, TPaginationParams } from '../../utils/pagination';
import { AuditLogService } from '../auditLog/auditLog.service';
import { NotificationService } from '../notification/notification.service';

const setUserBanStatus = async (actorId: string, userId: string, isBanned: boolean) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isBanned },
    select: { id: true, email: true, role: true, isBanned: true },
  });

  await AuditLogService.log(actorId, isBanned ? 'BAN_USER' : 'UNBAN_USER', 'User', userId);

  return updated;
};

const setHospitalVerification = async (
  actorId: string,
  hospitalId: string,
  verificationStatus: VerificationStatus,
  alreadyMessage: string,
  action: string,
) => {
  const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } });

  if (!hospital) {
    throw new AppError(404, 'Hospital not found');
  }

  if (hospital.verificationStatus === verificationStatus) {
    throw new AppError(400, alreadyMessage);
  }

  const updated = await prisma.hospital.update({
    where: { id: hospitalId },
    data: { verificationStatus },
  });

  await AuditLogService.log(actorId, action, 'Hospital', hospitalId);
  const verified = verificationStatus === VerificationStatus.VERIFIED;
  await NotificationService.notify([hospital.userId], {
    type: verified ? 'HOSPITAL_VERIFIED' : 'HOSPITAL_REJECTED',
    title: verified ? 'Your hospital is verified' : 'Verification not approved',
    message: verified
      ? 'Your requests now reach donors as soon as our team checks them.'
      : 'We could not verify your hospital. Check your licence details and contact us.',
    link: '/dashboard/hospital/profile',
  });

  return updated;
};

const verifyHospital = (actorId: string, hospitalId: string) =>
  setHospitalVerification(
    actorId,
    hospitalId,
    VerificationStatus.VERIFIED,
    'This hospital is already verified',
    'VERIFY_HOSPITAL',
  );

const rejectHospital = (actorId: string, hospitalId: string) =>
  setHospitalVerification(
    actorId,
    hospitalId,
    VerificationStatus.REJECTED,
    'This hospital has already been rejected',
    'REJECT_HOSPITAL',
  );

const getAnalytics = async () => {
  const [
    totalDonors,
    availableDonors,
    totalHospitals,
    verifiedHospitals,
    pendingHospitals,
    requestsByStatus,
    completedDonations,
    bannedUsers,
  ] = await Promise.all([
    prisma.donorProfile.count({ where: { deletedAt: null } }),
    prisma.donorProfile.count({ where: { deletedAt: null, isAvailable: true } }),
    prisma.hospital.count({ where: { deletedAt: null } }),
    prisma.hospital.count({ where: { deletedAt: null, verificationStatus: VerificationStatus.VERIFIED } }),
    prisma.hospital.count({ where: { deletedAt: null, verificationStatus: VerificationStatus.PENDING } }),
    prisma.bloodRequest.groupBy({ by: ['status'], where: { deletedAt: null }, _count: { _all: true } }),
    prisma.donation.count({ where: { status: DonationStatus.COMPLETED } }),
    prisma.user.count({ where: { isBanned: true } }),
  ]);

  const requestCounts = Object.fromEntries(
    Object.values(RequestStatus).map((status) => [
      status,
      requestsByStatus.find((r) => r.status === status)?._count._all ?? 0,
    ]),
  );

  const totalRequests = Object.values(requestCounts).reduce((sum, count) => sum + count, 0);

  return {
    donors: { total: totalDonors, available: availableDonors },
    hospitals: { total: totalHospitals, verified: verifiedHospitals, pending: pendingHospitals },
    requests: { total: totalRequests, byStatus: requestCounts },
    donationsCompleted: completedDonations,
    bannedUsers,
  };
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Days are bucketed in Bangladesh time so late-night requests land on the right date.
const toDhakaDate = (date: Date) => date.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });

const emergencyLevel = (urgency: number) => {
  if (urgency >= 5) return 'critical';
  if (urgency >= 4) return 'severe';
  if (urgency >= 3) return 'urgent';
  return 'standard';
};

// The last `days` calendar dates in Dhaka, oldest first, ending with today.
const lastDhakaDates = (days: number) => {
  const [y, m, d] = toDhakaDate(new Date()).split('-').map(Number);
  const todayUtc = Date.UTC(y, m - 1, d);
  return Array.from({ length: days }, (_, i) =>
    new Date(todayUtc - (days - 1 - i) * DAY_MS).toISOString().slice(0, 10),
  );
};

const getTimeSeries = async (days: number) => {
  const dates = lastDhakaDates(days);
  // Midnight at the start of the first day, Dhaka time (UTC+6, no DST).
  const since = new Date(`${dates[0]}T00:00:00+06:00`);

  const [createdRequests, completedDonations, groupTotals, openRequests] = await Promise.all([
    prisma.bloodRequest.findMany({
      where: { deletedAt: null, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.donation.findMany({
      where: { status: DonationStatus.COMPLETED, completedAt: { gte: since } },
      select: { completedAt: true },
    }),
    prisma.bloodRequest.groupBy({ by: ['bloodGroup'], where: { deletedAt: null }, _count: { _all: true } }),
    prisma.bloodRequest.findMany({
      where: { deletedAt: null, status: RequestStatus.VERIFIED },
      select: { bloodGroup: true, urgency: true },
    }),
  ]);

  // One entry per day, including days with no activity, so charts draw a continuous line.
  const daily = new Map(dates.map((date) => [date, { date, requests: 0, donations: 0 }]));
  createdRequests.forEach(({ createdAt }) => {
    const bucket = daily.get(toDhakaDate(createdAt));
    if (bucket) bucket.requests += 1;
  });
  completedDonations.forEach(({ completedAt }) => {
    const bucket = completedAt ? daily.get(toDhakaDate(completedAt)) : undefined;
    if (bucket) bucket.donations += 1;
  });

  const byBloodGroup = Object.values(BloodGroup).map((bloodGroup) => ({
    bloodGroup,
    total: groupTotals.find((g) => g.bloodGroup === bloodGroup)?._count._all ?? 0,
    open: openRequests.filter((r) => r.bloodGroup === bloodGroup).length,
  }));

  const openByEmergencyLevel = { critical: 0, severe: 0, urgent: 0, standard: 0 };
  openRequests.forEach(({ urgency }) => {
    openByEmergencyLevel[emergencyLevel(urgency)] += 1;
  });

  return { days, since: dates[0], daily: [...daily.values()], byBloodGroup, openByEmergencyLevel };
};

const parseBool = (value: unknown) => {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return undefined;
};

const listUsers = async (query: TPaginationParams & { isBanned?: unknown; role?: unknown; search?: unknown }) => {
  const { page, limit, skip } = parsePagination(query);
  const isBanned = parseBool(query.isBanned);
  const role = Object.values(Role).includes(query.role as Role) ? (query.role as Role) : undefined;
  const search =
    typeof query.search === 'string' && query.search.trim() ? query.search.trim().slice(0, 100) : undefined;

  const where: Prisma.UserWhereInput = {
    ...(isBanned === undefined ? {} : { isBanned }),
    ...(role ? { role } : {}),
    ...(search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { hospital: { name: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        isVolunteer: true,
        isBanned: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { users, meta: { page, limit, total, totalPage: Math.ceil(total / limit) || 1 } };
};

export const AdminService = {
  setUserBanStatus,
  verifyHospital,
  rejectHospital,
  getAnalytics,
  getTimeSeries,
  listUsers,
};
