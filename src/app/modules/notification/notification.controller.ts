import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { NotificationService } from './notification.service';
import { generateSocketToken } from '../../utils/jwt';

const listMyNotifications = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationService.listMyNotifications(req.user!.userId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Notifications retrieved successfully',
    data: result,
  });
});

const markAsRead = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationService.markAsRead(req.params.id as string, req.user!.userId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Notification marked as read',
    data: result,
  });
});

const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationService.markAllAsRead(req.user!.userId);
  sendResponse(res, { statusCode: 200, success: true, message: 'All notifications marked as read', data: result });
});

// A 5-minute pass the website uses to open a live socket (see realtime/socket.ts).
const getSocketToken = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Socket token issued',
    data: { token: generateSocketToken(req.user!.userId) },
  });
});

export const NotificationController = {
  markAllAsRead,
  getSocketToken,
  listMyNotifications,
  markAsRead,
};
