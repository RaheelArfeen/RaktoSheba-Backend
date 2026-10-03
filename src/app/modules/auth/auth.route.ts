import express, { Request, Response } from 'express';
import { Role } from '@prisma/client';
import passport from '../../../config/passport';
import catchAsync from '../../utils/catchAsync';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { AuthValidation } from './auth.validation';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const router = express.Router();

router.post(
  '/register',
  validateRequest(AuthValidation.registerValidationSchema),
  AuthController.register,
);

router.post('/login', validateRequest(AuthValidation.loginValidationSchema), AuthController.login);

router.post(
  '/refresh-token',
  validateRequest(AuthValidation.refreshTokenValidationSchema),
  AuthController.refresh,
);

router.post('/logout', auth(), AuthController.logout);

// The website this API serves; Google sign-ins are sent back here.
const clientUrl = () => (process.env.CLIENT_URL || process.env.CORS_ORIGIN?.split(',')[0] || 'http://localhost:3000').replace(/\/$/, '');

type TGoogleState = { role?: 'DONOR' | 'HOSPITAL'; next?: string };

const encodeState = (state: TGoogleState) => Buffer.from(JSON.stringify(state)).toString('base64url');
const decodeState = (raw: unknown): TGoogleState => {
  try {
    return typeof raw === 'string' ? (JSON.parse(Buffer.from(raw, 'base64url').toString()) as TGoogleState) : {};
  } catch {
    return {};
  }
};
const safeNext = (next: unknown) => (typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : undefined);

// Step 1: send the visitor to Google. The chosen role and return page ride along in `state`.
router.get('/google', (req: Request, res: Response, next) => {
  const role = req.query.role === 'HOSPITAL' ? 'HOSPITAL' : req.query.role === 'DONOR' ? 'DONOR' : undefined;
  const state = encodeState({ role, next: safeNext(req.query.next) });
  passport.authenticate('google', { scope: ['profile', 'email'], session: false, state })(req, res, next);
});

// Step 2: Google sends the visitor back here. Hand them to the website with a 2-minute pass.
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/api/v1/auth/google/failed' }),
  async (req: Request, res: Response) => {
    const state = decodeState(req.query.state);
    const back = new URL('/auth/google/callback', clientUrl());
    try {
      const googleUser = req.user as unknown as { email: string; googleId: string };
      const { exchangeToken } = await AuthService.loginOrRegisterWithGoogle(googleUser, state.role as Role | undefined);
      back.searchParams.set('token', exchangeToken);
      if (state.next) back.searchParams.set('next', state.next);
    } catch (error) {
      back.pathname = '/auth/login';
      back.searchParams.set('error', error instanceof Error ? error.message : 'Google sign-in failed');
    }
    res.redirect(back.toString());
  },
);

router.get('/google/failed', (req: Request, res: Response) => {
  const back = new URL('/auth/login', clientUrl());
  back.searchParams.set('error', 'Google sign-in was cancelled or failed. Please try again.');
  res.redirect(back.toString());
});

// Step 3: the website swaps the pass for a normal session.
router.post(
  '/google/exchange',
  validateRequest(AuthValidation.googleExchangeValidationSchema),
  catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.exchangeGoogleToken(req.body.token);
    res.status(200).json({ success: true, message: 'Logged in with Google successfully', data: result });
  }),
);

export const AuthRoutes = router;
