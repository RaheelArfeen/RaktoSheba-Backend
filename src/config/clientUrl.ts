// Where the website lives, for redirects back from Google sign-in and Stripe checkout.
// Uses CLIENT_URL (or the first CORS_ORIGIN) when set. On Vercel a localhost value is
// never right, so it is skipped and the live site is used instead.
const LIVE_SITE = 'https://raktosheba.vercel.app';

const isLocal = (url: string) => /\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(url);

export const clientUrl = () => {
  const onVercel = Boolean(process.env.VERCEL);
  const candidates = [process.env.CLIENT_URL, process.env.CORS_ORIGIN?.split(',')[0]]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .filter((value) => !(onVercel && isLocal(value)));
  return (candidates[0] ?? (onVercel ? LIVE_SITE : 'http://localhost:3000')).replace(/\/$/, '');
};
