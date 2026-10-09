import express from 'express';
import { Role } from '@prisma/client';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { PaymentValidation } from './payment.validation';
import { PaymentController } from './payment.controller';

const router = express.Router();

router.post(
  '/initiate',
  auth(),
  validateRequest(PaymentValidation.initiatePaymentValidationSchema),
  PaymentController.initiatePayment,
);

router.get('/me', auth(), PaymentController.listMyPayments);

router.get('/stats', auth(Role.ADMIN), PaymentController.getStats);

router.get('/', auth(Role.ADMIN), PaymentController.listAllPayments);

router.get('/success', PaymentController.paymentSuccessPage);

router.get('/cancel', PaymentController.paymentCancelPage);

router.get('/:id', auth(), PaymentController.getPaymentById);

export const PaymentRoutes = router;
