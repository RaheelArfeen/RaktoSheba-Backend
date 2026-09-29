import express from 'express';
import { Role } from '@prisma/client';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { BloodRequestValidation } from './bloodRequest.validation';
import { BloodRequestController } from './bloodRequest.controller';

const router = express.Router();

router.post(
  '/',
  auth(Role.HOSPITAL),
  validateRequest(BloodRequestValidation.createBloodRequestValidationSchema),
  BloodRequestController.createRequest,
);

router.get('/', auth(), BloodRequestController.listRequests);

router.get('/:id', auth(), BloodRequestController.getRequestById);

router.get('/:id/matches', auth(Role.ADMIN, Role.HOSPITAL), BloodRequestController.getMatches);

router.patch('/:id/verify', auth(Role.ADMIN), BloodRequestController.verifyRequest);

router.patch('/:id/cancel', auth(), BloodRequestController.cancelRequest);

router.post('/:id/accept', auth(Role.DONOR), BloodRequestController.acceptRequest);

router.patch('/:id/fulfill', auth(Role.HOSPITAL, Role.ADMIN), BloodRequestController.fulfillRequest);

export const BloodRequestRoutes = router;
