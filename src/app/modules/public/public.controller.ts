import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import AppError from '../../utils/AppError';
import { PublicService } from './public.service';
import { PublicValidation } from './public.validation';

const getStats = catchAsync(async (req: Request, res: Response) => {
  const result = await PublicService.getStats();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Platform stats retrieved successfully',
    data: result,
  });
});

const getUrgentRequests = catchAsync(async (req: Request, res: Response) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 6, 1), 20);
  const result = await PublicService.getUrgentRequests(limit);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Urgent requests retrieved successfully',
    data: result,
  });
});

const getRequestBoard = catchAsync(async (req: Request, res: Response) => {
  const parsed = PublicValidation.requestBoardQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    throw new AppError(400, 'Invalid request board filters');
  }

  const { requests, meta } = await PublicService.getRequestBoard(parsed.data);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Request board retrieved successfully',
    data: requests,
    meta,
  });
});

const getPublicRequestById = catchAsync(async (req: Request, res: Response) => {
  const result = await PublicService.getPublicRequestById(req.params.id as string);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Blood request retrieved successfully',
    data: result,
  });
});

export const PublicController = {
  getStats,
  getUrgentRequests,
  getRequestBoard,
  getPublicRequestById,
};
