import { BloodGroup, DonationStatus, Prisma, RequestStatus, Role } from '@prisma/client';
import prisma from '../../../config/prisma';
import AppError from '../../utils/AppError';
import { isEligibleByLastDonation } from '../donor/donor.constant';
import { getCompatibleDonorGroups } from './bloodCompatibility';
import { findMatchingDonors } from './matching';
import { NotificationService, bloodLabel } from '../notification/notification.service';
import { AuditLogService } from '../auditLog/auditLog.service';
import { parsePagination, TPaginationParams } from '../../utils/pagination';

type TCreateBloodRequestPayload = {
  bloodGroup: BloodGroup;
  unitsNeeded: number;
  urgency?: number;
  lat?: number;
  lng?: number;
};

type TViewer = { userId: string; role: Role };

type TListRequestFilters = TPaginationParams & {
  status?: RequestStatus;
  bloodGroup?: BloodGroup;
  minUrgency?: number;
  search?: string;
  sortBy?: 'createdAt' | 'urgency';
  sortOrder?: 'asc' | 'desc';
};

// Public-facing requester details: the hospital, never the account's credentials.
const requesterSelect = {
  select: {
    id: true,
    email: true,
    hospital: { select: { id: true, name: true, address: true, verificationStatus: true } },
  },
} satisfies Prisma.UserDefaultArgs;

const createRequest = async (requesterId: string, payload: TCreateBloodRequestPayload) => {
  const request = await prisma.bloodRequest.create({
    data: {
      requesterId,
      bloodGroup: payload.bloodGroup,
      unitsNeeded: payload.unitsNeeded,
      urgency: payload.urgency ?? 1,
      lat: payload.lat,
      lng: payload.lng,
    },
  });

  await NotificationService.notifyAdminsOfNewRequest(request);

  return request;
};

const getRequestById = async (id: string) => {
  const request = await prisma.bloodRequest.findFirst({
    where: { id, deletedAt: null },
    include: {
      requester: requesterSelect,
      donation: {
        include: {
          donor: { select: { id: true, bloodGroup: true, photoUrl: true, user: { select: { email: true } } } },
        },
      },
    },
  });

  if (!request) {
    throw new AppError(404, 'Blood request not found');
  }

  return request;
};

// Hospitals only ever see their own requests; donors never see requests an admin
// has not verified yet (those have not been announced to donors).
const scopeForViewer = (viewer: TViewer): Prisma.BloodRequestWhereInput => {
  if (viewer.role === Role.HOSPITAL) return { requesterId: viewer.userId };
  if (viewer.role === Role.DONOR) return { status: { not: RequestStatus.PENDING } };
  return {};
};

const listRequests = async (viewer: TViewer, filters: TListRequestFilters) => {
  const { page, limit, skip } = parsePagination(filters);
  const sortBy = filters.sortBy ?? 'createdAt';
  const sortOrder = filters.sortOrder ?? 'desc';

  const where: Prisma.BloodRequestWhereInput = {
    AND: [
      scopeForViewer(viewer),
      {
        deletedAt: null,
        status: filters.status,
        bloodGroup: filters.bloodGroup,
        urgency: filters.minUrgency ? { gte: filters.minUrgency } : undefined,
        ...(filters.search
          ? {
              requester: {
                hospital: {
                  is: {
                    deletedAt: null,
                    OR: [
                      { name: { contains: filters.search, mode: 'insensitive' } },
                      { address: { contains: filters.search, mode: 'insensitive' } },
                    ],
                  },
                },
              },
            }
          : {}),
      },
    ],
  };

  const [requests, total] = await Promise.all([
    prisma.bloodRequest.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: { requester: requesterSelect, donation: true },
    }),
    prisma.bloodRequest.count({ where }),
  ]);

  return { requests, meta: { page, limit, total, totalPage: Math.ceil(total / limit) || 1 } };
};

// Counts and totals that back the hospital dashboard overview.
const getMyStats = async (hospitalUserId: string) => {
  const scope: Prisma.BloodRequestWhereInput = { requesterId: hospitalUserId, deletedAt: null };

  const [byStatusRows, openUnits, donationsCompleted] = await Promise.all([
    prisma.bloodRequest.groupBy({ by: ['status'], where: scope, _count: { _all: true } }),
    prisma.bloodRequest.aggregate({
      where: { ...scope, status: RequestStatus.VERIFIED },
      _sum: { unitsNeeded: true },
    }),
    prisma.donation.count({
      where: { status: DonationStatus.COMPLETED, request: { requesterId: hospitalUserId, deletedAt: null } },
    }),
  ]);

  const byStatus = Object.fromEntries(
    Object.values(RequestStatus).map((status) => [
      status,
      byStatusRows.find((row) => row.status === status)?._count._all ?? 0,
    ]),
  ) as Record<RequestStatus, number>;

  const total = Object.values(byStatus).reduce((sum, count) => sum + count, 0);

  return { total, byStatus, openUnits: openUnits._sum.unitsNeeded ?? 0, donationsCompleted };
};

const verifyRequest = async (actorId: string, id: string) => {
  const request = await prisma.bloodRequest.findFirst({ where: { id, deletedAt: null } });

  if (!request) {
    throw new AppError(404, 'Blood request not found');
  }

  if (request.status !== RequestStatus.PENDING) {
    throw new AppError(400, `Cannot verify a request with status ${request.status}`);
  }

  const verifiedRequest = await prisma.bloodRequest.update({
    where: { id },
    data: { status: RequestStatus.VERIFIED },
  });

  await AuditLogService.log(actorId, 'VERIFY_REQUEST', 'BloodRequest', id);
  await NotificationService.fanOutForRequest(verifiedRequest);
  await NotificationService.notify([verifiedRequest.requesterId], {
    type: 'REQUEST_VERIFIED',
    title: 'Request verified',
    message: `Your ${bloodLabel(verifiedRequest.bloodGroup)} request is live. Compatible donors have been alerted.`,
    link: `/dashboard/hospital/requests/${id}`,
    requestId: id,
  });

  return verifiedRequest;
};

const cancelRequest = async (actorId: string, id: string, requesterId: string, isAdmin: boolean) => {
  const request = await prisma.bloodRequest.findFirst({ where: { id, deletedAt: null } });

  if (!request) {
    throw new AppError(404, 'Blood request not found');
  }

  if (!isAdmin && request.requesterId !== requesterId) {
    throw new AppError(403, 'You can only cancel your own requests');
  }

  if (request.status === RequestStatus.FULFILLED) {
    throw new AppError(400, 'Cannot cancel a fulfilled request');
  }

  const cancelled = await prisma.bloodRequest.update({
    where: { id },
    data: { status: RequestStatus.CANCELLED },
  });

  await AuditLogService.log(actorId, 'CANCEL_REQUEST', 'BloodRequest', id);

  // A donor who already said yes needs to know they don't have to go.
  const donation = await prisma.donation.findUnique({
    where: { requestId: id },
    select: { donor: { select: { userId: true } } },
  });
  if (donation) {
    await NotificationService.notify([donation.donor.userId], {
      type: 'REQUEST_CANCELLED',
      title: 'Request cancelled',
      message: `The ${bloodLabel(request.bloodGroup)} request you accepted was cancelled. You don't need to go in.`,
      link: '/dashboard/donor/donations',
      requestId: id,
    });
  }

  return cancelled;
};

const getMatches = async (requestId: string) => {
  const request = await prisma.bloodRequest.findFirst({ where: { id: requestId, deletedAt: null } });

  if (!request) {
    throw new AppError(404, 'Blood request not found');
  }

  return findMatchingDonors(request);
};

const acceptRequest = async (requestId: string, donorUserId: string) => {
  const request = await prisma.bloodRequest.findFirst({ where: { id: requestId, deletedAt: null } });

  if (!request) {
    throw new AppError(404, 'Blood request not found');
  }

  if (request.status === RequestStatus.FULFILLED || request.status === RequestStatus.CANCELLED) {
    throw new AppError(400, `This request is already ${request.status.toLowerCase()}`);
  }

  const donorProfile = await prisma.donorProfile.findFirst({
    where: { userId: donorUserId, deletedAt: null },
  });

  if (!donorProfile) {
    throw new AppError(404, 'Donor profile not found. Create a donor profile first.');
  }

  if (!donorProfile.isAvailable) {
    throw new AppError(400, 'You are marked as unavailable. Update your availability first.');
  }

  if (!isEligibleByLastDonation(donorProfile.lastDonationAt)) {
    throw new AppError(400, 'You are not yet eligible to donate (must wait 90 days between donations)');
  }

  // One donation at a time: finish or withdraw the current one before taking another.
  const upcoming = await prisma.donation.findFirst({
    where: { donorId: donorProfile.id, status: DonationStatus.SCHEDULED, request: { status: RequestStatus.MATCHED } },
  });
  if (upcoming) {
    throw new AppError(400, 'You already have an upcoming donation. Finish or withdraw it before accepting another.');
  }

  const compatibleGroups = getCompatibleDonorGroups(request.bloodGroup);

  if (!compatibleGroups.includes(donorProfile.bloodGroup)) {
    throw new AppError(400, 'Your blood group is not compatible with this request');
  }

  try {
    const donation = await prisma.$transaction(async (tx) => {
      const created = await tx.donation.create({
        data: {
          donorId: donorProfile.id,
          requestId: request.id,
          scheduledAt: new Date(),
        },
      });

      await tx.bloodRequest.update({
        where: { id: request.id },
        data: { status: RequestStatus.MATCHED },
      });

      return created;
    });

    await AuditLogService.log(donorUserId, 'ACCEPT_REQUEST', 'BloodRequest', requestId);
    await NotificationService.notify([request.requesterId], {
      type: 'DONOR_ACCEPTED',
      title: 'A donor is on the way',
      message: `A donor with ${bloodLabel(donorProfile.bloodGroup)} blood accepted your ${bloodLabel(request.bloodGroup)} request.`,
      link: `/dashboard/hospital/requests/${requestId}`,
      requestId,
    });

    return donation;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError(409, 'This request has already been matched with another donor');
    }
    throw error;
  }
};

// Hospital confirms the matched donor gave blood. The request, the donation and the
// donor's last-donation date (which drives the 90-day rule) change together.
const fulfillRequest = async (actorId: string, id: string, isAdmin: boolean) => {
  const request = await prisma.bloodRequest.findFirst({
    where: { id, deletedAt: null },
    include: { donation: true },
  });

  if (!request) {
    throw new AppError(404, 'Blood request not found');
  }

  if (!isAdmin && request.requesterId !== actorId) {
    throw new AppError(403, 'You can only fulfill your own requests');
  }

  if (request.status !== RequestStatus.MATCHED || !request.donation) {
    throw new AppError(400, `Only matched requests can be fulfilled (current status: ${request.status})`);
  }

  const donation = request.donation;
  const completedAt = new Date();

  const fulfilled = await prisma.$transaction(async (tx) => {
    await tx.donation.update({
      where: { id: donation.id },
      data: { status: DonationStatus.COMPLETED, completedAt },
    });

    await tx.donorProfile.update({
      where: { id: donation.donorId },
      data: { lastDonationAt: completedAt },
    });

    return tx.bloodRequest.update({
      where: { id },
      data: { status: RequestStatus.FULFILLED },
      include: { donation: true },
    });
  });

  await AuditLogService.log(actorId, 'FULFILL_REQUEST', 'BloodRequest', id);

  const donor = await prisma.donorProfile.findUnique({ where: { id: donation.donorId }, select: { userId: true } });
  if (donor) {
    await NotificationService.notify([donor.userId], {
      type: 'REQUEST_FULFILLED',
      title: 'Thank you for donating',
      message: 'The hospital confirmed your donation. You can give again in 90 days.',
      link: '/dashboard/donor/donations',
      requestId: id,
    });
  }

  return fulfilled;
};

export const BloodRequestService = {
  createRequest,
  getRequestById,
  listRequests,
  getMyStats,
  verifyRequest,
  cancelRequest,
  getMatches,
  acceptRequest,
  fulfillRequest,
};
