import express from 'express';
import { AuthRoutes } from '../modules/auth/auth.route';
import { DonorRoutes } from '../modules/donor/donor.route';
import { BloodRequestRoutes } from '../modules/bloodRequest/bloodRequest.route';
import { NotificationRoutes } from '../modules/notification/notification.route';
import { HospitalRoutes } from '../modules/hospital/hospital.route';
import { AdminRoutes } from '../modules/admin/admin.route';
import { UserRoutes } from '../modules/user/user.route';
import { PaymentRoutes } from '../modules/payment/payment.route';
import { PublicRoutes } from '../modules/public/public.route';

const router = express.Router();

const moduleRoutes = [
  {
    path: '/auth',
    route: AuthRoutes,
  },
  {
    path: '/users',
    route: UserRoutes,
  },
  {
    path: '/donors',
    route: DonorRoutes,
  },
  {
    path: '/requests',
    route: BloodRequestRoutes,
  },
  {
    path: '/notifications',
    route: NotificationRoutes,
  },
  {
    path: '/hospitals',
    route: HospitalRoutes,
  },
  {
    path: '/admin',
    route: AdminRoutes,
  },
  {
    path: '/payments',
    route: PaymentRoutes,
  },
  {
    path: '/public',
    route: PublicRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
