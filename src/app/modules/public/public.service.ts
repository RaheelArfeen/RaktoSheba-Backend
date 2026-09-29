import { DonationStatus, RequestStatus } from '@prisma/client';
import prisma from '../../../config/prisma';

// Aggregate counts only — safe to expose without authentication.
const getStats = async () => {
  const [totalDonors, availableDonors, verifiedHospitals, completedDonations, openRequests] =
    await Promise.all([
      prisma.donorProfile.count({ where: { deletedAt: null } }),
      prisma.donorProfile.count({ where: { deletedAt: null, isAvailable: true } }),
      prisma.hospital.count({ where: { deletedAt: null, verified: true } }),
      prisma.donation.count({ where: { status: DonationStatus.COMPLETED } }),
      prisma.bloodRequest.count({ where: { deletedAt: null, status: RequestStatus.VERIFIED } }),
    ]);

  return { totalDonors, availableDonors, verifiedHospitals, completedDonations, openRequests };
};

// Verified, still-open requests with only public fields (no requester identity or exact coordinates).
const getUrgentRequests = async (limit = 6) => {
  const requests = await prisma.bloodRequest.findMany({
    where: { deletedAt: null, status: RequestStatus.VERIFIED },
    orderBy: [{ urgency: 'desc' }, { createdAt: 'desc' }],
    take: limit,
    select: {
      id: true,
      bloodGroup: true,
      unitsNeeded: true,
      urgency: true,
      createdAt: true,
      requester: { select: { hospital: { select: { name: true, address: true } } } },
    },
  });

  return requests.map(({ requester, ...request }) => ({
    ...request,
    hospital: requester.hospital,
  }));
};

export const PublicService = {
  getStats,
  getUrgentRequests,
};
