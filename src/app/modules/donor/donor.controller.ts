import { Request, Response } from 'express';
import { BloodGroup } from '@prisma/client';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import AppError from '../../utils/AppError';
import { DonorService } from './donor.service';

const createProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await DonorService.createProfile(req.user!.userId, req.body);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Donor profile created successfully',
    data: result,
  });
});

const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await DonorService.getMyProfile(req.user!.userId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Donor profile retrieved successfully',
    data: result,
  });
});

const getDonorById = catchAsync(async (req: Request, res: Response) => {
  const result = await DonorService.getDonorById(req.params.id as string);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Donor retrieved successfully',
    data: result,
  });
});

const updateMyProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await DonorService.updateMyProfile(req.user!.userId, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Donor profile updated successfully',
    data: result,
  });
});

const updateAvailability = catchAsync(async (req: Request, res: Response) => {
  const result = await DonorService.updateAvailability(req.user!.userId, req.body.isAvailable);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Availability updated successfully',
    data: result,
  });
});

const listDonors = catchAsync(async (req: Request, res: Response) => {
  const { bloodGroup, isAvailable, search, page, limit, sortBy, sortOrder } = req.query;

  const { donors, meta } = await DonorService.listDonors({
    bloodGroup: bloodGroup as BloodGroup | undefined,
    isAvailable: isAvailable === undefined ? undefined : isAvailable === 'true',
    search: search as string | undefined,
    page: page as string | undefined,
    limit: limit as string | undefined,
    sortBy: sortBy as 'bloodGroup' | 'lastDonationAt' | undefined,
    sortOrder: sortOrder as 'asc' | 'desc' | undefined,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Donors retrieved successfully',
    data: donors,
    meta,
  });
});

const uploadPhoto = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError(400, 'No photo file uploaded');
  }

  const result = await DonorService.uploadPhoto(req.user!.userId, req.file);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Photo uploaded successfully',
    data: result,
  });
});

const deleteMyProfile = catchAsync(async (req: Request, res: Response) => {
  await DonorService.deleteMyProfile(req.user!.userId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Donor profile deleted successfully',
  });
});

const getMyMatches = catchAsync(async (req: Request, res: Response) => {
  const result = await DonorService.getMyMatches(req.user!.userId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Matching requests retrieved successfully',
    data: result,
  });
});

const getMyDonations = catchAsync(async (req: Request, res: Response) => {
  const result = await DonorService.getMyDonations(req.user!.userId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Donations retrieved successfully',
    data: result,
  });
});

export const DonorController = {
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
