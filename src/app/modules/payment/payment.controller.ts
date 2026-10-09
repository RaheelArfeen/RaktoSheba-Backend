import { Request, Response } from 'express';
import { PaymentStatus } from '@prisma/client';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import AppError from '../../utils/AppError';
import { PaymentPurpose } from './payment.constant';
import { PaymentService } from './payment.service';

const initiatePayment = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.initiatePayment(req.user!.userId, req.body);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Payment initiated successfully',
    data: result,
  });
});

const handleWebhook = catchAsync(async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'];

  if (typeof signature !== 'string') {
    throw new AppError(400, 'Missing Stripe signature header');
  }

  const result = await PaymentService.handleWebhookEvent(req.body as Buffer, signature);
  res.status(200).json(result);
});

const getPaymentById = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.getPaymentById(
    req.params.id as string,
    req.user!.userId,
    req.user!.role,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payment retrieved successfully',
    data: result,
  });
});

const listMyPayments = catchAsync(async (req: Request, res: Response) => {
  const { payments, meta } = await PaymentService.listMyPayments(req.user!.userId, req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payments retrieved successfully',
    data: payments,
    meta,
  });
});

const listAllPayments = catchAsync(async (req: Request, res: Response) => {
  const { status, purpose, ...pagination } = req.query;
  const { payments, meta } = await PaymentService.listAllPayments({
    ...pagination,
    status: status as PaymentStatus | undefined,
    purpose: purpose as PaymentPurpose | undefined,
  });
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payments retrieved successfully',
    data: payments,
    meta,
  });
});

const getStats = catchAsync(async (_req: Request, res: Response) => {
  const result = await PaymentService.getStats();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payment stats retrieved successfully',
    data: result,
  });
});

const paymentSuccessPage = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payment completed. You may close this window.',
    data: { paymentId: req.query.paymentId ?? null },
  });
});

const paymentCancelPage = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    statusCode: 200,
    success: false,
    message: 'Payment was cancelled.',
    data: { paymentId: req.query.paymentId ?? null },
  });
});

export const PaymentController = {
  initiatePayment,
  handleWebhook,
  getPaymentById,
  listMyPayments,
  listAllPayments,
  getStats,
  paymentSuccessPage,
  paymentCancelPage,
};
