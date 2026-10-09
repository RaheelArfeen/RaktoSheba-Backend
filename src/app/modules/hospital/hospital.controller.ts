import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import AppError from '../../utils/AppError';
import { HospitalService } from './hospital.service';

const createProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await HospitalService.createProfile(req.user!.userId, req.body);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Hospital profile created successfully',
    data: result,
  });
});

const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await HospitalService.getMyProfile(req.user!.userId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Hospital profile retrieved successfully',
    data: result,
  });
});

const updateMyProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await HospitalService.updateMyProfile(req.user!.userId, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Hospital profile updated successfully',
    data: result,
  });
});

const uploadLicenseDocument = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError(400, 'No document file uploaded');
  }

  const result = await HospitalService.uploadLicenseDocument(req.user!.userId, req.file);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Document uploaded successfully',
    data: result,
  });
});

const uploadLogo = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError(400, 'No logo file uploaded');
  }

  const result = await HospitalService.uploadLogo(req.user!.userId, req.file);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Logo uploaded successfully',
    data: result,
  });
});

const listHospitals = catchAsync(async (req: Request, res: Response) => {
  const { hospitals, meta } = await HospitalService.listHospitals(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Hospitals retrieved successfully',
    data: hospitals,
    meta,
  });
});

export const HospitalController = {
  createProfile,
  getMyProfile,
  updateMyProfile,
  uploadLicenseDocument,
  uploadLogo,
  listHospitals,
};
