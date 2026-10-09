import { BloodGroup, DonationStatus, Prisma, RequestStatus, VerificationStatus } from '@prisma/client';
import prisma from '../../../config/prisma';
import AppError from '../../utils/AppError';
import { isCompatibleDonor } from '../bloodRequest/bloodCompatibility';
import { TRequestBoardQuery } from './public.validation';

// Aggregate counts only — safe to expose without authentication.
const getStats = async () => {
  const [totalDonors, availableDonors, verifiedHospitals, completedDonations, openRequests] =
    await Promise.all([
      prisma.donorProfile.count({ where: { deletedAt: null } }),
      prisma.donorProfile.count({ where: { deletedAt: null, isAvailable: true } }),
      prisma.hospital.count({ where: { deletedAt: null, verificationStatus: VerificationStatus.VERIFIED } }),
      prisma.donation.count({ where: { status: DonationStatus.COMPLETED } }),
      prisma.bloodRequest.count({ where: { deletedAt: null, status: RequestStatus.VERIFIED } }),
    ]);

  return { totalDonors, availableDonors, verifiedHospitals, completedDonations, openRequests };
};

// Only public fields: no requester account, no exact coordinates, no donor identity.
const publicRequestSelect = {
  id: true,
  bloodGroup: true,
  unitsNeeded: true,
  urgency: true,
  status: true,
  createdAt: true,
  requester: { select: { hospital: { select: { name: true, address: true } } } },
} satisfies Prisma.BloodRequestSelect;

type TPublicRequestRow = Prisma.BloodRequestGetPayload<{ select: typeof publicRequestSelect }>;

const toPublicRequest = ({ requester, ...request }: TPublicRequestRow) => ({
  ...request,
  hospital: requester.hospital,
});

const boardStatuses: Record<TRequestBoardQuery['status'], RequestStatus[]> = {
  open: [RequestStatus.VERIFIED],
  matched: [RequestStatus.MATCHED],
  fulfilled: [RequestStatus.FULFILLED],
  all: [RequestStatus.VERIFIED, RequestStatus.MATCHED, RequestStatus.FULFILLED],
};

// Verified, still-open requests, most urgent first — used by the home page.
const getUrgentRequests = async (limit = 6) => {
  const requests = await prisma.bloodRequest.findMany({
    where: { deletedAt: null, status: RequestStatus.VERIFIED },
    orderBy: [{ urgency: 'desc' }, { createdAt: 'desc' }],
    take: limit,
    select: publicRequestSelect,
  });

  return requests.map(toPublicRequest);
};

// Every recipient group a donor of this group can safely give to.
const recipientGroupsFor = (donor: BloodGroup) =>
  Object.values(BloodGroup).filter((recipient) => isCompatibleDonor(donor, recipient));

// Public request board: filter by group, minimum urgency, hospital name/address and status.
const getRequestBoard = async (query: TRequestBoardQuery) => {
  const where: Prisma.BloodRequestWhereInput = {
    deletedAt: null,
    status: { in: boardStatuses[query.status] },
    bloodGroup: query.bloodGroup ?? (query.canHelp ? { in: recipientGroupsFor(query.canHelp) } : undefined),
    urgency: query.minUrgency ? { gte: query.minUrgency } : undefined,
    requester: query.search
      ? {
          hospital: {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { address: { contains: query.search, mode: 'insensitive' } },
            ],
          },
        }
      : undefined,
  };

  // Ties are broken by recency so paging is stable.
  const orderBy: Prisma.BloodRequestOrderByWithRelationInput[] =
    query.sortBy === 'urgency'
      ? [{ urgency: query.sortOrder }, { createdAt: 'desc' }]
      : [{ createdAt: query.sortOrder }];

  const [requests, total] = await Promise.all([
    prisma.bloodRequest.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: publicRequestSelect,
    }),
    prisma.bloodRequest.count({ where }),
  ]);

  return {
    requests: requests.map(toPublicRequest),
    meta: { page: query.page, limit: query.limit, total, totalPage: Math.ceil(total / query.limit) },
  };
};

// Single request for the public detail page. Unverified requests stay hidden.
const getPublicRequestById = async (id: string) => {
  const request = await prisma.bloodRequest.findFirst({
    where: { id, deletedAt: null, status: { not: RequestStatus.PENDING } },
    select: {
      ...publicRequestSelect,
      donation: { select: { status: true, scheduledAt: true, completedAt: true } },
    },
  });

  if (!request) {
    throw new AppError(404, 'Blood request not found');
  }

  const { donation, ...rest } = request;
  return { ...toPublicRequest(rest), donation };
};

export const PublicService = {
  getStats,
  getUrgentRequests,
  getRequestBoard,
  getPublicRequestById,
};
