import { HospitalType, Prisma, VerificationStatus } from '@prisma/client';
import prisma from '../../../config/prisma';
import AppError from '../../utils/AppError';
import { parsePagination, TPaginationParams } from '../../utils/pagination';
import { uploadToCloudinary } from '../../utils/uploadToCloudinary';

type THospitalPayload = {
  name: string;
  address: string;
  type?: HospitalType;
  email?: string;
  district?: string;
  upazila?: string;
  phone?: string;
  emergencyPhone?: string;
  website?: string;
  openHours?: string;
  hasEmergencyService?: boolean;
  description?: string;
  licenseNumber?: string;
};

const createProfile = async (userId: string, payload: THospitalPayload) => {
  const existingProfile = await prisma.hospital.findUnique({ where: { userId } });

  if (existingProfile) {
    throw new AppError(409, 'Hospital profile already exists for this user');
  }

  return prisma.hospital.create({
    data: { userId, ...payload },
  });
};

const getMyProfile = async (userId: string) => {
  const profile = await prisma.hospital.findUnique({ where: { userId } });

  if (!profile) {
    throw new AppError(404, 'Hospital profile not found');
  }

  return profile;
};

const updateMyProfile = async (userId: string, payload: Partial<THospitalPayload>) => {
  const existingProfile = await prisma.hospital.findUnique({ where: { userId } });

  if (!existingProfile) {
    throw new AppError(404, 'Hospital profile not found');
  }

  return prisma.hospital.update({
    where: { userId },
    data: payload,
  });
};

const uploadLicenseDocument = async (userId: string, file: Express.Multer.File) => {
  const existingProfile = await prisma.hospital.findUnique({ where: { userId } });

  if (!existingProfile) {
    throw new AppError(404, 'Hospital profile not found');
  }

  const { url } = await uploadToCloudinary(file.buffer, 'hospital-documents', existingProfile.id);

  return prisma.hospital.update({
    where: { userId },
    data: { licenseDocUrl: url },
  });
};

const uploadLogo = async (userId: string, file: Express.Multer.File) => {
  const existingProfile = await prisma.hospital.findUnique({ where: { userId } });

  if (!existingProfile) {
    throw new AppError(404, 'Hospital profile not found');
  }

  const { url } = await uploadToCloudinary(file.buffer, 'hospital-logos', existingProfile.id);

  return prisma.hospital.update({
    where: { userId },
    data: { logoUrl: url },
  });
};

const listHospitals = async (
  query: TPaginationParams & { verificationStatus?: unknown; search?: unknown } = {},
) => {
  const { page, limit, skip } = parsePagination(query);
  const verificationStatus = Object.values(VerificationStatus).includes(
    query.verificationStatus as VerificationStatus,
  )
    ? (query.verificationStatus as VerificationStatus)
    : undefined;
  const search =
    typeof query.search === 'string' && query.search.trim() ? query.search.trim().slice(0, 100) : undefined;
  const where: Prisma.HospitalWhereInput = {
    deletedAt: null,
    ...(verificationStatus ? { verificationStatus } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { address: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [hospitals, total] = await Promise.all([
    prisma.hospital.findMany({
      where,
      skip,
      take: limit,
      include: { user: { select: { id: true, email: true } } },
      orderBy: { id: 'desc' },
    }),
    prisma.hospital.count({ where }),
  ]);

  return { hospitals, meta: { page, limit, total, totalPage: Math.ceil(total / limit) || 1 } };
};

export const HospitalService = {
  createProfile,
  getMyProfile,
  updateMyProfile,
  uploadLicenseDocument,
  uploadLogo,
  listHospitals,
};
