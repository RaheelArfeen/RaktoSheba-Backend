import express from 'express';
import { Role } from '@prisma/client';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import upload from '../../middlewares/upload';
import { DonorValidation } from './donor.validation';
import { DonorController } from './donor.controller';

const router = express.Router();

router.post(
  '/',
  auth(Role.DONOR),
  validateRequest(DonorValidation.createDonorProfileValidationSchema),
  DonorController.createProfile,
);

router.get('/me', auth(Role.DONOR), DonorController.getMyProfile);

router.get('/me/matches', auth(Role.DONOR), DonorController.getMyMatches);

router.get('/me/donations', auth(Role.DONOR), DonorController.getMyDonations);

router.patch(
  '/me',
  auth(Role.DONOR),
  validateRequest(DonorValidation.updateDonorProfileValidationSchema),
  DonorController.updateMyProfile,
);

router.patch(
  '/me/availability',
  auth(Role.DONOR),
  validateRequest(DonorValidation.updateAvailabilityValidationSchema),
  DonorController.updateAvailability,
);

router.delete('/me', auth(Role.DONOR), DonorController.deleteMyProfile);

router.post(
  '/me/photo',
  auth(Role.DONOR),
  upload.single('photo'),
  DonorController.uploadPhoto,
);

router.get('/', auth(Role.ADMIN, Role.HOSPITAL), DonorController.listDonors);

router.get('/:id', auth(Role.ADMIN, Role.HOSPITAL), DonorController.getDonorById);

export const DonorRoutes = router;
