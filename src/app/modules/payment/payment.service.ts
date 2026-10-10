import { Payment, PaymentStatus, Role } from '@prisma/client';
import Stripe from 'stripe';
import stripe from '../../../config/stripe';
import prisma from '../../../config/prisma';
import { clientUrl } from '../../../config/clientUrl';
import AppError from '../../utils/AppError';
import { parsePagination, TPaginationParams } from '../../utils/pagination';
import { PaymentPurpose } from './payment.constant';

type TInitiatePaymentPayload = {
  amount: number;
  purpose: PaymentPurpose;
  requestId?: string;
};

// Stripe sends the payer back to the frontend's /payment/success and /payment/cancel
// pages. If those aren't configured, fall back to this API's own simple pages rather
// than handing Stripe a broken "undefined?paymentId=..." URL.
const redirectUrl = (envValue: string | undefined, fallbackPath: string, paymentId: string) => {
  // Default: the website's own /payment/success or /payment/cancel page.
  const base = envValue && !(process.env.VERCEL && envValue.includes('localhost'))
    ? envValue
    : `${clientUrl()}/payment/${fallbackPath}`;
  const url = new URL(base);
  url.searchParams.set('paymentId', paymentId);
  return url.toString();
};

const initiatePayment = async (userId: string, payload: TInitiatePaymentPayload) => {
  if (payload.requestId) {
    const request = await prisma.bloodRequest.findFirst({
      where: { id: payload.requestId, deletedAt: null },
    });

    if (!request) {
      throw new AppError(404, 'Blood request not found');
    }
  }

  const payment = await prisma.payment.create({
    data: {
      userId,
      requestId: payload.requestId,
      amount: payload.amount,
      purpose: payload.purpose,
      status: PaymentStatus.PENDING,
    },
  });

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(payload.amount * 100),
          product_data: {
            name:
              payload.purpose === 'EMERGENCY_FUND'
                ? 'RaktoSheba emergency fund contribution'
                : 'RaktoSheba platform donation',
          },
        },
        quantity: 1,
      },
    ],
    metadata: { paymentId: payment.id },
    success_url: redirectUrl(process.env.CLIENT_SUCCESS_URL, 'success', payment.id),
    cancel_url: redirectUrl(process.env.CLIENT_CANCEL_URL, 'cancel', payment.id),
  });

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: { gatewayRef: session.id },
  });

  return { payment: updated, checkoutUrl: session.url };
};

const handleWebhookEvent = async (rawBody: Buffer, signature: string) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new AppError(500, 'Stripe webhook secret is not configured');
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature';
    throw new AppError(400, `Webhook signature verification failed: ${message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const paymentId = session.metadata?.paymentId;

    if (paymentId) {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.PAID },
      });
    }
  }

  if (event.type === 'checkout.session.expired' || event.type === 'payment_intent.payment_failed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const paymentId = session.metadata?.paymentId;

    if (paymentId) {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.FAILED },
      });
    }
  }

  return { received: true };
};

// The webhook is the source of truth, but it can't reach a local dev machine and can
// arrive after the payer lands on the success page. For a still-pending payment, ask
// Stripe directly. If Stripe is unreachable, keep the stored status.
const syncPendingWithStripe = async (payment: Payment): Promise<Payment> => {
  if (payment.status !== PaymentStatus.PENDING || !payment.gatewayRef) return payment;

  try {
    const session = await stripe.checkout.sessions.retrieve(payment.gatewayRef);
    const status =
      session.payment_status === 'paid'
        ? PaymentStatus.PAID
        : session.status === 'expired'
          ? PaymentStatus.FAILED
          : null;

    return status ? prisma.payment.update({ where: { id: payment.id }, data: { status } }) : payment;
  } catch {
    return payment;
  }
};

const getPaymentById = async (id: string, userId: string, role: Role) => {
  const payment = await prisma.payment.findUnique({ where: { id } });

  if (!payment) {
    throw new AppError(404, 'Payment not found');
  }

  if (role !== Role.ADMIN && payment.userId !== userId) {
    throw new AppError(403, 'You can only view your own payments');
  }

  return syncPendingWithStripe(payment);
};

const listMyPayments = async (userId: string, query: TPaginationParams) => {
  const { page, limit, skip } = parsePagination(query);

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.payment.count({ where: { userId } }),
  ]);

  return { payments, meta: { page, limit, total } };
};

const listAllPayments = async (query: TPaginationParams & { status?: PaymentStatus; purpose?: PaymentPurpose }) => {
  const { page, limit, skip } = parsePagination(query);

  const where: { status?: PaymentStatus; purpose?: PaymentPurpose } = {};
  if (query.status && Object.values(PaymentStatus).includes(query.status)) where.status = query.status;
  if (query.purpose && Object.values(PaymentPurpose).includes(query.purpose)) where.purpose = query.purpose;

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, email: true } } },
    }),
    prisma.payment.count({ where }),
  ]);

  return { payments, meta: { page, limit, total } };
};

const getStats = async () => {
  const [byStatus, byPurpose, paidTotal] = await Promise.all([
    prisma.payment.groupBy({ by: ['status'], _count: { _all: true }, _sum: { amount: true } }),
    prisma.payment.groupBy({
      by: ['purpose'],
      where: { status: PaymentStatus.PAID },
      _count: { _all: true },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({ where: { status: PaymentStatus.PAID }, _sum: { amount: true } }),
  ]);

  return {
    totalCollected: Number(paidTotal._sum.amount ?? 0),
    totalPayments: byStatus.reduce((sum, row) => sum + row._count._all, 0),
    byStatus: Object.fromEntries(
      Object.values(PaymentStatus).map((status) => {
        const row = byStatus.find((r) => r.status === status);
        return [status, { count: row?._count._all ?? 0, amount: Number(row?._sum.amount ?? 0) }];
      }),
    ),
    byPurpose: Object.fromEntries(
      Object.values(PaymentPurpose).map((purpose) => {
        const row = byPurpose.find((r) => r.purpose === purpose);
        return [purpose, { count: row?._count._all ?? 0, amount: Number(row?._sum.amount ?? 0) }];
      }),
    ),
  };
};

export const PaymentService = {
  initiatePayment,
  handleWebhookEvent,
  getPaymentById,
  listMyPayments,
  listAllPayments,
  getStats,
};
