import express from 'express';
import { PublicController } from './public.controller';

const router = express.Router();

router.get('/stats', PublicController.getStats);

router.get('/urgent-requests', PublicController.getUrgentRequests);

export const PublicRoutes = router;
