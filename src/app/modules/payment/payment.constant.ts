// `payment.purpose` is a plain String column in the Prisma schema, so the allowed
// values live here instead of in the generated Prisma client.
export const PaymentPurpose = {
  PLATFORM_DONATION: 'PLATFORM_DONATION',
  EMERGENCY_FUND: 'EMERGENCY_FUND',
} as const;

export type PaymentPurpose = (typeof PaymentPurpose)[keyof typeof PaymentPurpose];
