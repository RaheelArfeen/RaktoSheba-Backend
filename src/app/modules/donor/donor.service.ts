import { BloodGroup, DonationStatus, Prisma, RequestStatus } from '@prisma/client';
import prisma from '../../../config/prisma';
import AppError from '../../utils/AppError';
import { isEligibleByLastDonation } from './donor.constant';
import { parsePagination, TPaginationParams } from '../../utils/pagination';
import { uploadToCloudinary } from '../../utils/uploadToCloudinary';
import { distanceInKm, isCompatibleDonor } from '../bloodRequest/bloodCompatibility';
import { AuditLogService } from '../auditLog/auditLog.service';

type TCreateDonorProfilePayload = {
  bloodGroup: BloodGroup;
  lastDonationAt?: string;
  lat?: number;
  lng?: number;
};

type TUpdateDonorProfilePayload = Partial<TCreateDonorProfilePayload>;

type TListDonorFilters = TPaginationParams & {
  bloodGroup?: BloodGroup;
  isAvailable?: boolean;
  search?: string;
  sortBy?: 'bloodGroup' | 'lastDonationAt';
  sortOrder?: 'asc' | 'desc';
};

const withEligibility = <T extends { lastDonationAt: Date | null }>(profile: T) => ({
  ...profile,
  isEligible: isEligibleByLastDonation(profile.lastDonationAt),
});

const createProfile = async (userId: string, payload: TCreateDonorProfilePayload) => {
  const existingProfile = await prisma.donorProfile.findUnique({ where: { userId } });

  if (existingProfile) {
    throw new AppError(409, 'Donor profile already exists for this user');
  }

  const profile = await prisma.donorProfile.create({
    data: {
      userId,
      bloodGroup: payload.bloodGroup,
      lastDonationAt: payload.lastDonationAt ? new Date(payload.lastDonationAt) : null,
      lat: payload.lat,
      lng: payload.lng,
    },
  });

  return withEligibility(profile);
};

const getMyProfile = async (userId: string) => {
  const profile = await prisma.donorProfile.findFirst({ where: { userId, deletedAt: null } });

  if (!profile) {
    throw new AppError(404, 'Donor profile not found');
  }

  return withEligibility(profile);
};

const getDonorById = async (id: string) => {
  const profile = await prisma.donorProfile.findFirst({
    where: { id, deletedAt: null },
    include: { user: { select: { id: true, email: true } } },
  });

  if (!profile) {
    throw new AppError(404, 'Donor not found');
  }

  return withEligibility(profile);
};

const updateMyProfile = async (userId: string, payload: TUpdateDonorProfilePayload) => {
  const existingProfile = await prisma.donorProfile.findFirst({ where: { userId, deletedAt: null } });

  if (!existingProfile) {
    throw new AppError(404, 'Donor profile not found');
  }

  const profile = await prisma.donorProfile.update({
    where: { userId },
    data: {
      bloodGroup: payload.bloodGroup,
      lastDonationAt: payload.lastDonationAt ? new Date(payload.lastDonationAt) : undefined,
      lat: payload.lat,
      lng: payload.lng,
    },
  });

  return withEligibility(profile);
};

const updateAvailability = async (userId: string, isAvailable: boolean) => {
  const existingProfile = await prisma.donorProfile.findFirst({ where: { userId, deletedAt: null } });

  if (!existingProfile) {
    throw new AppError(404, 'Donor profile not found');
  }

  const profile = await prisma.donorProfile.update({
    where: { userId },
    data: { isAvailable },
  });

  return withEligibility(profile);
};

const listDonors = async (filters: TListDonorFilters) => {
  const { page, limit, skip } = parsePagination(filters);
  const sortBy = filters.sortBy ?? 'bloodGroup';
  const sortOrder = filters.sortOrder ?? 'asc';

  const where: Prisma.DonorProfileWhereInput = {
    deletedAt: null,
    bloodGroup: filters.bloodGroup,
    isAvailable: filters.isAvailable,
    ...(filters.search
      ? { user: { email: { contains: filters.search, mode: 'insensitive' } } }
      : {}),
  };

  const [profiles, total] = await Promise.all([
    prisma.donorProfile.findMany({
      where,
      skip,
      take: limit,
      include: { user: { select: { id: true, email: true } } },
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.donorProfile.count({ where }),
  ]);

  return { donors: profiles.map(withEligibility), meta: { page, limit, total } };
};

const uploadPhoto = async (userId: string, file: Express.Multer.File) => {
  const existingProfile = await prisma.donorProfile.findFirst({ where: { userId, deletedAt: null } });

  if (!existingProfile) {
    throw new AppError(404, 'Donor profile not found');
  }

  const { url } = await uploadToCloudinary(file.buffer, 'donor-photos', existingProfile.id);

  const profile = await prisma.donorProfile.update({
    where: { userId },
    data: { photoUrl: url },
  });

  return withEligibility(profile);
};

const deleteMyProfile = async (userId: string) => {
  const existingProfile = await prisma.donorProfile.findFirst({ where: { userId, deletedAt: null } });

  if (!existingProfile) {
    throw new AppError(404, 'Donor profile not found');
  }

  await prisma.donorProfile.update({ where: { userId }, data: { deletedAt: new Date() } });
};

const requireProfile = async (userId: string) => {
  const profile = await prisma.donorProfile.findFirst({ where: { userId, deletedAt: null } });
  if (!profile) {
    throw new AppError(404, 'Donor profile not found');
  }
  return profile;
};

// Open, verified requests this donor's blood can safely go to: most urgent first, then nearest.
const getMyMatches = async (userId: string) => {
  const profile = await requireProfile(userId);
  const recipientGroups = Object.values(BloodGroup).filter((group) => isCompatibleDonor(profile.bloodGroup, group));

  const requests = await prisma.bloodRequest.findMany({
    where: { deletedAt: null, status: RequestStatus.VERIFIED, bloodGroup: { in: recipientGroups } },
    select: {
      id: true,
      bloodGroup: true,
      unitsNeeded: true,
      urgency: true,
      status: true,
      createdAt: true,
      lat: true,
      lng: true,
      requester: { select: { hospital: { select: { name: true, address: true } } } },
    },
  });

  return requests
    .map(({ requester, lat, lng, ...request }) => ({
      ...request,
      hospital: requester.hospital,
      distanceKm:
        lat != null && lng != null && profile.lat != null && profile.lng != null
          ? Math.round(distanceInKm(profile.lat, profile.lng, lat, lng) * 10) / 10
          : null,
    }))
    .sort(
      (a, b) =>
        b.urgency - a.urgency ||
        (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) ||
        b.createdAt.getTime() - a.createdAt.getTime(),
    );
};

// Every donation this donor has scheduled or completed, newest first.
const getMyDonations = async (userId: string) => {
  const profile = await requireProfile(userId);

  return prisma.donation.findMany({
    where: { donorId: profile.id },
    orderBy: [{ scheduledAt: 'desc' }],
    include: {
      request: {
        select: {
          id: true,
          bloodGroup: true,
          unitsNeeded: true,
          urgency: true,
          status: true,
          createdAt: true,
          requester: { select: { hospital: { select: { name: true, address: true } } } },
        },
      },
    },
  });
};

// A donor who can no longer make it backs out: the match is removed and the request reopens for other donors.
const withdrawDonation = async (userId: string, donationId: string) => {
  const profile = await requireProfile(userId);
  const donation = await prisma.donation.findFirst({
    where: { id: donationId, donorId: profile.id },
    include: { request: { select: { status: true } } },
  });

  if (!donation) {
    throw new AppError(404, 'Donation not found');
  }
  if (donation.status !== DonationStatus.SCHEDULED || donation.request.status !== RequestStatus.MATCHED) {
    throw new AppError(400, 'Only an upcoming donation can be withdrawn');
  }

  // The donation row is deleted (not just cancelled) because a request can hold only one donation.
  await prisma.$transaction([
    prisma.donation.delete({ where: { id: donation.id } }),
    prisma.bloodRequest.update({ where: { id: donation.requestId }, data: { status: RequestStatus.VERIFIED } }),
  ]);

  await AuditLogService.log(userId, 'WITHDRAW_DONATION', 'BloodRequest', donation.requestId);

  return { requestId: donation.requestId };
};

export const DonorService = {
  withdrawDonation,
  getMyMatches,
  getMyDonations,
  createProfile,
  getMyProfile,
  getDonorById,
  updateMyProfile,
  updateAvailability,
  listDonors,
  uploadPhoto,
  deleteMyProfile,
};
