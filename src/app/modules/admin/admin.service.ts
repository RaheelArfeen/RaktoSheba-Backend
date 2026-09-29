import { BloodGroup, DonationStatus, RequestStatus } from '@prisma/client';
import prisma from '../../../config/prisma';
import AppError from '../../utils/AppError';
import { AuditLogService } from '../auditLog/auditLog.service';

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

const verifyHospital = async (actorId: string, hospitalId: string) => {
  const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } });

  if (!hospital) {
    throw new AppError(404, 'Hospital not found');
  }

  if (hospital.verified) {
    throw new AppError(400, 'This hospital is already verified');
  }

  const updated = await prisma.hospital.update({
    where: { id: hospitalId },
    data: { verified: true },
  });

  await AuditLogService.log(actorId, 'VERIFY_HOSPITAL', 'Hospital', hospitalId);

  return updated;
};

const getAnalytics = async () => {
  const [
    totalDonors,
    availableDonors,
    totalHospitals,
    verifiedHospitals,
    requestsByStatus,
    completedDonations,
    bannedUsers,
  ] = await Promise.all([
    prisma.donorProfile.count({ where: { deletedAt: null } }),
    prisma.donorProfile.count({ where: { deletedAt: null, isAvailable: true } }),
    prisma.hospital.count({ where: { deletedAt: null } }),
    prisma.hospital.count({ where: { deletedAt: null, verified: true } }),
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
    hospitals: { total: totalHospitals, verified: verifiedHospitals },
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

export const AdminService = {
  setUserBanStatus,
  verifyHospital,
  getAnalytics,
  getTimeSeries,
};
