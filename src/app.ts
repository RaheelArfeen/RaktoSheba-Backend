import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import express, { Application, Request, Response } from 'express';
import prisma from './config/prisma';
import routes from './app/routes';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import { PaymentController } from './app/modules/payment/payment.controller';
import { openApiSpec } from './docs/openapi';

const app: Application = express();

// On Vercel the app sits behind one proxy hop; trust it so req.ip is the real caller.
app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
    credentials: true,
  }),
);

// Stripe requires the raw request body to verify webhook signatures, so this
// route is registered before express.json() and given its own raw parser.
app.post(
  '/api/v1/payments/webhook',
  express.raw({ type: 'application/json' }),
  PaymentController.handleWebhook,
);

app.use(express.json());

// The website loads data from its own server, so many visitors can share one IP.
// Reads are cheap and safe, so only changes (POST/PATCH/DELETE) count toward this limit.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  skip: (req) => req.method === 'GET' || req.method === 'HEAD',
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later', errors: [] },
});

// Only failed sign-ins count, so password guessing is blocked without locking out real users.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many auth attempts, please try again later',
    errors: [],
  },
});

app.use('/api', globalLimiter);
app.use('/api/v1/auth', authLimiter);

app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'RaktoSheba API is running',
  });
});

app.get('/health', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ success: true, message: 'Database connected' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Database connection failed' });
  }
});

app.get('/api/v1/docs.json', (req: Request, res: Response) => {
  res.status(200).json(openApiSpec);
});

app.use(
  '/api/v1/docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec, { customSiteTitle: 'RaktoSheba API Docs' }),
);

app.use('/api/v1', routes);

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    errors: [],
  });
});

app.use(globalErrorHandler);

export default app;
