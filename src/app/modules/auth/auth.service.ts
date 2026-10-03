import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import prisma from '../../../config/prisma';
import AppError from '../../utils/AppError';
import {
  generateAccessToken,
  generateGoogleExchangeToken,
  generateRefreshToken,
  verifyGoogleExchangeToken,
  verifyRefreshToken,
} from '../../utils/jwt';

const register = async (payload: { email: string; password: string; role?: Role }) => {
  const existingUser = await prisma.user.findUnique({ where: { email: payload.email } });

  if (existingUser) {
    throw new AppError(409, 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(payload.password, 12);

  const user = await prisma.user.create({
    data: {
      email: payload.email,
      passwordHash,
      role: payload.role ?? Role.DONOR,
    },
  });

  const tokenPayload = { userId: user.id, email: user.email, role: user.role };

  return {
    user: { id: user.id, email: user.email, role: user.role },
    accessToken: generateAccessToken(tokenPayload),
    refreshToken: generateRefreshToken(tokenPayload),
  };
};

const login = async (payload: { email: string; password: string }) => {
  const user = await prisma.user.findUnique({ where: { email: payload.email } });

  if (!user || !user.passwordHash) {
    throw new AppError(401, 'Invalid email or password');
  }

  if (user.isBanned) {
    throw new AppError(403, 'This account has been banned');
  }

  const passwordMatched = await bcrypt.compare(payload.password, user.passwordHash);

  if (!passwordMatched) {
    throw new AppError(401, 'Invalid email or password');
  }

  const tokenPayload = { userId: user.id, email: user.email, role: user.role };

  return {
    user: { id: user.id, email: user.email, role: user.role },
    accessToken: generateAccessToken(tokenPayload),
    refreshToken: generateRefreshToken(tokenPayload),
  };
};

const refresh = async (token: string) => {
  const decoded = verifyRefreshToken(token);

  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

  if (!user) {
    throw new AppError(401, 'This user no longer exists');
  }

  const tokenPayload = { userId: user.id, email: user.email, role: user.role };

  return { accessToken: generateAccessToken(tokenPayload) };
};

// After Google confirms the email: find or create the account and return a short-lived
// pass for the website. New accounts get the role chosen on the sign-up page (never admin);
// existing accounts keep their role.
const loginOrRegisterWithGoogle = async (payload: { email: string; googleId: string }, role?: Role) => {
  let user = await prisma.user.findUnique({ where: { email: payload.email } });
  const isNew = !user;

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: payload.email,
        oauthProvider: 'google',
        role: role === Role.HOSPITAL ? Role.HOSPITAL : Role.DONOR,
      },
    });
  }

  if (user.isBanned) {
    throw new AppError(403, 'This account has been banned');
  }

  return { exchangeToken: generateGoogleExchangeToken(user.id, isNew) };
};

// The website swaps the one-time pass for a normal session.
const exchangeGoogleToken = async (token: string) => {
  let payload;
  try {
    payload = verifyGoogleExchangeToken(token);
  } catch {
    throw new AppError(401, 'This Google sign-in link has expired. Please try again.');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) throw new AppError(401, 'Account not found');
  if (user.isBanned) throw new AppError(403, 'This account has been banned');

  const tokenPayload = { userId: user.id, email: user.email, role: user.role };
  return {
    user: { id: user.id, email: user.email, role: user.role },
    accessToken: generateAccessToken(tokenPayload),
    refreshToken: generateRefreshToken(tokenPayload),
    isNew: payload.isNew,
  };
};

export const AuthService = {
  register,
  login,
  refresh,
  loginOrRegisterWithGoogle,
  exchangeGoogleToken,
};
