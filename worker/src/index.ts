import { Hono } from 'hono';
import { requireAccess, type AppEnv } from './lib/auth';
import { raccolta, validaDiario, validaRicetta } from './routes/raccolte';
import { fotoRoutes } from './routes/foto';
import { chefRoutes } from './routes/chef';

export type Env = {
  DB: D1Database;
  FOTO: R2Bucket;
  ACCESS_TEAM: string;
  ACCESS_AUD: string;
  ALLOWED_EMAIL: string;
  ANTHROPIC_API_KEY?: string;
  DEV_EMAIL?: string;
};

const app = new Hono<AppEnv>();

app.get('/health', (c) => c.json({ ok: true }));
app.use('/api/*', requireAccess);
app.route('/api/diario', raccolta('diario', validaDiario, 'data desc, creato desc'));
app.route('/api/ricette', raccolta('ricette', validaRicetta, 'titolo collate nocase'));
app.route('/api/foto', fotoRoutes);
app.route('/api/chef', chefRoutes);

export default { fetch: app.fetch };
export { app };
