import { betterAuth } from 'better-auth';
import { pool } from '../../../packages/db/client.ts';
export const origin = process.env.APP_ORIGIN || 'http://localhost:5173';
if (
  !process.env.BETTER_AUTH_SECRET ||
  process.env.BETTER_AUTH_SECRET.length < 32
)
  throw new Error(
    'A random BETTER_AUTH_SECRET of at least 32 characters is required.',
  );
export const auth = betterAuth({
  database: pool,
  baseURL: origin,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [origin],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
  },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  advanced: { useSecureCookies: process.env.NODE_ENV === 'production' },
  rateLimit: { enabled: true, window: 60, max: 30 },
});
