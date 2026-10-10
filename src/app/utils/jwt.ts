import jwt, { SignOptions } from 'jsonwebtoken';

export type TJwtPayload = {
  userId: string;
  email: string;
  role: string;
};

export const generateAccessToken = (payload: TJwtPayload): string => {
  const secret = process.env.JWT_ACCESS_SECRET as string;
  const expiresIn = (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as SignOptions['expiresIn'];
  return jwt.sign(payload, secret, { expiresIn });
};

export const generateRefreshToken = (payload: TJwtPayload): string => {
  const secret = process.env.JWT_REFRESH_SECRET as string;
  const expiresIn = (process.env.JWT_REFRESH_EXPIRES_IN || '30d') as SignOptions['expiresIn'];
  return jwt.sign(payload, secret, { expiresIn });
};

export const verifyAccessToken = (token: string): TJwtPayload => {
  const secret = process.env.JWT_ACCESS_SECRET as string;
  return jwt.verify(token, secret) as TJwtPayload;
};

export const verifyRefreshToken = (token: string): TJwtPayload => {
  const secret = process.env.JWT_REFRESH_SECRET as string;
  return jwt.verify(token, secret) as TJwtPayload;
};

// One-time pass used to hand a Google sign-in back to the website. It uses its own
// signing key, so it can never be mistaken for (or used as) an access token.
type TGoogleExchangePayload = { userId: string; purpose: 'google-exchange'; isNew: boolean };

const googleExchangeSecret = () => `${process.env.JWT_ACCESS_SECRET as string}:google-exchange`;

export const generateGoogleExchangeToken = (userId: string, isNew: boolean): string =>
  jwt.sign({ userId, purpose: 'google-exchange', isNew } satisfies TGoogleExchangePayload, googleExchangeSecret(), {
    expiresIn: '2m',
  });

export const verifyGoogleExchangeToken = (token: string): TGoogleExchangePayload => {
  const payload = jwt.verify(token, googleExchangeSecret()) as TGoogleExchangePayload;
  if (payload.purpose !== 'google-exchange') throw new Error('Wrong token purpose');
  return payload;
};

// Short-lived pass for opening a live notification socket. Like the Google pass, it has
// its own signing key and can't be used as an access token.
type TSocketPayload = { userId: string; purpose: 'socket' };

const socketSecret = () => `${process.env.JWT_ACCESS_SECRET as string}:socket`;

export const generateSocketToken = (userId: string): string =>
  jwt.sign({ userId, purpose: 'socket' } satisfies TSocketPayload, socketSecret(), { expiresIn: '5m' });

export const verifySocketToken = (token: string): TSocketPayload => {
  const payload = jwt.verify(token, socketSecret()) as TSocketPayload;
  if (payload.purpose !== 'socket') throw new Error('Wrong token purpose');
  return payload;
};
