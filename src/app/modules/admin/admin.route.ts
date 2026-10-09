import express from 'express';
import { Role } from '@prisma/client';
import auth from '../../middlewares/auth';
import { AdminController } from './admin.controller';

const router = express.Router();

router.use(auth(Role.ADMIN));

router.get('/users', AdminController.listUsers);

router.patch('/users/:id/ban', AdminController.banUser);

router.patch('/users/:id/unban', AdminController.unbanUser);

router.patch('/hospitals/:id/verify', AdminController.verifyHospital);

router.patch('/hospitals/:id/reject', AdminController.rejectHospital);

router.get('/analytics', AdminController.getAnalytics);

router.get('/analytics/timeseries', AdminController.getTimeSeries);

router.get('/audit-logs', AdminController.listAuditLogs);

export const AdminRoutes = router;
