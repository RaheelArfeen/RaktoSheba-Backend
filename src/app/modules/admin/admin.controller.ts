import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AdminService } from './admin.service';
import { z } from 'zod';
import AppError from '../../utils/AppError';
import { AuditLogService } from '../auditLog/auditLog.service';

const banUser = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.setUserBanStatus(req.user!.userId, req.params.id as string, true);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'User banned successfully',
    data: result,
  });
});

const unbanUser = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.setUserBanStatus(req.user!.userId, req.params.id as string, false);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'User unbanned successfully',
    data: result,
  });
});

const verifyHospital = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.verifyHospital(req.user!.userId, req.params.id as string);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Hospital verified successfully',
    data: result,
  });
});

const rejectHospital = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.rejectHospital(req.user!.userId, req.params.id as string);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Hospital rejected successfully',
    data: result,
  });
});

const getAnalytics = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getAnalytics();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Analytics retrieved successfully',
    data: result,
  });
});

const timeSeriesQuerySchema = z.object({
  days: z.coerce.number().int().min(7).max(90).default(30),
});

const getTimeSeries = catchAsync(async (req: Request, res: Response) => {
  const parsed = timeSeriesQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    throw new AppError(400, 'days must be a whole number between 7 and 90');
  }

  const result = await AdminService.getTimeSeries(parsed.data.days);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Time-series analytics retrieved successfully',
    data: result,
  });
});

const listAuditLogs = catchAsync(async (req: Request, res: Response) => {
  const { logs, meta } = await AuditLogService.listLogs(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Audit logs retrieved successfully',
    data: logs,
    meta,
  });
});

const listUsers = catchAsync(async (req: Request, res: Response) => {
  const { users, meta } = await AdminService.listUsers(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Users retrieved successfully',
    data: users,
    meta,
  });
});

export const AdminController = {
  banUser,
  unbanUser,
  verifyHospital,
  rejectHospital,
  getAnalytics,
  getTimeSeries,
  listAuditLogs,
  listUsers,
};
