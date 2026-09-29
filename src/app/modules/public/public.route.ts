import express from 'express';
import { PublicController } from './public.controller';

const router = express.Router();

router.get('/stats', PublicController.getStats);

router.get('/urgent-requests', PublicController.getUrgentRequests);

router.get('/requests', PublicController.getRequestBoard);

router.get('/requests/:id', PublicController.getPublicRequestById);

export const PublicRoutes = router;
