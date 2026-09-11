import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDb } from './db.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import ownerRoutes from './routes/owner.js';
import clientRoutes from './routes/client.js';
import messageRoutes from './routes/messages.js';
import orderRoutes from './routes/orders.js';

const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SERVER_DIR, '../..');
const CLIENT_DIR = path.join(PROJECT_ROOT, 'apps/client');
const ADMIN_DIR = path.join(PROJECT_ROOT, 'apps/admin');
const OWNER_DIR = path.join(PROJECT_ROOT, 'apps/owner');
const SHARED_DIR = path.join(PROJECT_ROOT, 'shared');
const ADMIN_PATH = process.env.ADMIN_PATH || '/control/a7c91';
const OWNER_PATH = process.env.OWNER_PATH || '/control/f4m28';
const ADMIN_ALIAS = '/admin';
const OWNER_ALIAS = '/owner';
const uploadDir = path.resolve('data/uploads');
fs.mkdirSync(uploadDir, { recursive: true });

if (process.env.NODE_ENV === 'production') {
  for (const key of ['JWT_SECRET', 'OWNER_EMAIL', 'OWNER_PASSWORD', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
    if (!process.env[key]) throw new Error(`${key} is required in production`);
  }
  if (String(process.env.JWT_SECRET).length < 32) throw new Error('JWT_SECRET must be at least 32 characters');
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));

const configuredOrigins = (process.env.ALLOWED_ORIGINS || process.env.CLIENT_ORIGIN || '').split(',').map(x => x.trim()).filter(Boolean);
if (configuredOrigins.length) {
  app.use(cors({
    origin: (origin, cb) => {
      if (!origin || configuredOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('CORS origin denied'));
    },
    credentials: true,
    maxAge: 600
  }));
}

app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: 'draft-8', legacyHeaders: false }));
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 12, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many authentication attempts. Try again later.' } });
const writeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 120, standardHeaders: 'draft-8', legacyHeaders: false });

const healthResponse = (req, res) => res.status(200).json({ ok: true, service: 'boxoffice-platform-api', time: new Date().toISOString() });
app.get('/health', healthResponse);
app.get('/api/health', healthResponse);
app.use('/api/auth/login', express.json({ limit: '64kb' }), authLimiter);
app.use('/api/auth/register-client', express.json({ limit: '64kb' }), authLimiter);
app.use('/api/auth/admins', express.json({ limit: '64kb' }), writeLimiter);
app.use('/api/admin', express.json({ limit: '256kb' }), writeLimiter, adminRoutes);
app.use('/api/owner', express.json({ limit: '256kb' }), writeLimiter, ownerRoutes);
app.use('/api/client', express.json({ limit: '256kb' }), clientRoutes);
app.use('/api/messages', writeLimiter, messageRoutes);
app.use('/api/orders', express.json({ limit: '256kb' }), writeLimiter, orderRoutes);
app.use('/api/auth', authRoutes);

app.use('/shared', express.static(SHARED_DIR, { dotfiles: 'deny', maxAge: '1h' }));
app.use('/client', express.static(CLIENT_DIR, { dotfiles: 'deny', maxAge: '1h', index: 'index.html' }));
app.use(ADMIN_ALIAS, express.static(ADMIN_DIR, { dotfiles: 'deny', maxAge: '1h' }));
app.use(OWNER_ALIAS, express.static(OWNER_DIR, { dotfiles: 'deny', maxAge: '1h' }));
app.get(`${ADMIN_ALIAS}/login`, (req, res) => res.sendFile(path.join(ADMIN_DIR, 'login.html')));
app.get(`${OWNER_ALIAS}/login`, (req, res) => res.sendFile(path.join(OWNER_DIR, 'login.html')));
app.get(`${ADMIN_ALIAS}`, (req, res) => res.sendFile(path.join(ADMIN_DIR, 'index.html')));
app.get(`${OWNER_ALIAS}`, (req, res) => res.sendFile(path.join(OWNER_DIR, 'index.html')));
app.get(`${ADMIN_ALIAS}/login.html`, (req, res) => res.sendFile(path.join(ADMIN_DIR, 'login.html')));
app.get(`${OWNER_ALIAS}/login.html`, (req, res) => res.sendFile(path.join(OWNER_DIR, 'login.html')));
app.use(ADMIN_PATH, express.static(ADMIN_DIR, { dotfiles: 'deny', maxAge: '1h' }));
app.use(OWNER_PATH, express.static(OWNER_DIR, { dotfiles: 'deny', maxAge: '1h' }));
app.get(`${ADMIN_PATH}/login`, (req, res) => res.sendFile(path.join(ADMIN_DIR, 'login.html')));
app.get(`${OWNER_PATH}/login`, (req, res) => res.sendFile(path.join(OWNER_DIR, 'login.html')));
app.get(ADMIN_PATH, (req, res) => res.sendFile(path.join(ADMIN_DIR, 'index.html')));
app.get(OWNER_PATH, (req, res) => res.sendFile(path.join(OWNER_DIR, 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(CLIENT_DIR, 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(CLIENT_DIR, 'register.html')));
app.get('/movies', (req, res) => res.sendFile(path.join(CLIENT_DIR, 'movies.html')));
app.get('/support', (req, res) => res.sendFile(path.join(CLIENT_DIR, 'support.html')));
const page = (dir, file) => (req, res) => res.sendFile(path.join(dir, `${file}.html`));
for (const name of ['start', 'history', 'profile']) app.get(`/client/${name}`, page(CLIENT_DIR, name));
for (const name of ['clients', 'messages', 'settings']) app.get(`/admin/${name}`, page(ADMIN_DIR, name));
for (const name of ['admins', 'clients', 'settings']) app.get(`/owner/${name}`, page(OWNER_DIR, name));
app.use(express.static(CLIENT_DIR, { dotfiles: 'deny', maxAge: '1h', index: 'index.html' }));
app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request body is too large' });
  res.status(err.status || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
});

const port = Number(process.env.PORT || 8787);
let server;
const shutdown = (signal) => {
  console.log(`${signal}: shutting down`);
  if (!server) process.exit(0);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

await initDb();
server = app.listen(port, '0.0.0.0', () => console.log(`API listening on port ${port}`));
