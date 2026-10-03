import { z } from 'zod';

const registerValidationSchema = z.object({
  body: z.object({
    email: z.string({ required_error: 'Email is required' }).email('Invalid email address'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(6, 'Password must be at least 6 characters long'),
    // Admins are created by the seed or by another admin, never by public signup.
    role: z.enum(['HOSPITAL', 'DONOR']).optional(),
  }),
});

const loginValidationSchema = z.object({
  body: z.object({
    email: z.string({ required_error: 'Email is required' }).email('Invalid email address'),
    password: z.string({ required_error: 'Password is required' }),
  }),
});

const refreshTokenValidationSchema = z.object({
  body: z.object({
    refreshToken: z.string({ required_error: 'Refresh token is required' }),
  }),
});

const googleExchangeValidationSchema = z.object({
  body: z.object({
    token: z.string({ required_error: 'token is required' }).min(10),
  }),
});

export const AuthValidation = {
  googleExchangeValidationSchema,
  registerValidationSchema,
  loginValidationSchema,
  refreshTokenValidationSchema,
};
