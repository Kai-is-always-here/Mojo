import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';

const dataDir = path.resolve('data');
const file = path.join(dataDir, 'db.json');
fs.mkdirSync(dataDir, { recursive: true });

const supabaseUrl = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const supabaseServiceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '');
const useSupabase = Boolean(supabaseUrl && supabaseServiceRoleKey);

export const db = { users: [], admins: [], clients: [], messages: [], orders: [], commissions: [], settings: {} };

function initialState() {
  const password = process.env.OWNER_PASSWORD;
  const email = String(process.env.OWNER_EMAIL || '').trim().toLowerCase();
  if (!password || !email) throw new Error('OWNER_EMAIL and OWNER_PASSWORD are required to initialize the owner account');
  return {
    orders: [], commissions: [],
    users: [{
      id: 'owner_1', role: 'owner', name: 'Platform Owner', email,
      passwordHash: bcrypt.hashSync(password, 12), status: 'active', createdAt: new Date().toISOString()
    }],
    admins: [], clients: [], messages: [],
    settings: { siteName: 'BoxOffice Platform', maintenance: false, defaultLanguage: 'en' }
  };
}

function assignState(state) {
  for (const key of ['users', 'admins', 'clients', 'messages', 'orders', 'commissions', 'settings']) {
    if (state?.[key] !== undefined) db[key] = state[key];
  }
}

function localLoad() {
  if (fs.existsSync(file)) {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    assignState(parsed);
    return;
  }
  assignState(initialState());
  localSave();
}

function localSave() {
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(db, null, 2), { mode: 0o600 });
  fs.renameSync(temp, file);
}

async function supabaseRequest(endpoint, options = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
    ...options,
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase persistence error (${response.status}): ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : null;
}

async function cloudLoad() {
  const rows = await supabaseRequest('platform_state?id=eq.1&select=state', { method: 'GET' });
  if (Array.isArray(rows) && rows[0]?.state) {
    assignState(rows[0].state);
    return;
  }
  const state = initialState();
  await supabaseRequest('platform_state', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ id: 1, state })
  });
  assignState(state);
}

export async function initDb() {
  if (process.env.NODE_ENV === 'production' && !useSupabase) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in production for durable persistence');
  }
  if (useSupabase) await cloudLoad();
  else localLoad();
  return db;
}

export async function save() {
  if (useSupabase) {
    await supabaseRequest('platform_state?id=eq.1', {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ state: db, updated_at: new Date().toISOString() })
    });
    return;
  }
  localSave();
}
