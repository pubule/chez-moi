import { createMiddleware } from 'hono/factory';
import { emailFromJwt } from './access';
import type { Env } from '../index';

export type AppEnv = { Bindings: Env };

// Un JWT di Access valido non basta: la mail deve essere in ALLOWED_EMAIL.
// DEV_EMAIL serve solo a test e sviluppo: mai in wrangler.jsonc né nei secret di produzione.
export const requireAccess = createMiddleware<AppEnv>(async (c, next) => {
  const email = (
    c.env.DEV_EMAIL ||
    (await emailFromJwt(c.req.header('Cf-Access-Jwt-Assertion'), { team: c.env.ACCESS_TEAM, aud: c.env.ACCESS_AUD })) ||
    ''
  ).toLowerCase();
  const ammesse = (c.env.ALLOWED_EMAIL ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!email || !ammesse.includes(email)) return c.json({ error: 'unauthorized' }, 401);
  await next();
});
