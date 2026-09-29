import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { PublicService } from './public.service';

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

export const PublicController = {
  getStats,
  getUrgentRequests,
};
