import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const supabaseUrl = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '');
const bucket = 'message-attachments';
const useSupabase = Boolean(supabaseUrl && serviceKey);
const localDir = path.resolve('data/uploads');
fs.mkdirSync(localDir, { recursive: true });

const safeName = (name) => String(name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'file';
const encodePath = (value) => String(value).split('/').map(encodeURIComponent).join('/');

async function storageRequest(pathname, options = {}) {
  const response = await fetch(`${supabaseUrl}/storage/v1/${pathname}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Storage error (${response.status}): ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : null;
}

export async function storeAttachment({ buffer, mime, name, ownerId }) {
  const clean = safeName(name);
  const stored = `${ownerId}/${crypto.randomUUID()}-${clean}`;
  if (!useSupabase) {
    const localName = `${crypto.randomUUID()}-${clean}`;
    fs.writeFileSync(path.join(localDir, localName), buffer, { mode: 0o600 });
    return { name: clean, mime, size: buffer.length, stored: localName, backend: 'local' };
  }
  await storageRequest(`object/${bucket}/${encodePath(stored)}`, {
    method: 'POST',
    headers: {
      'Content-Type': mime,
      'x-upsert': 'false',
      'cache-control': 'private,max-age=300'
    },
    body: buffer
  });
  return { name: clean, mime, size: buffer.length, stored, backend: 'supabase' };
}

export async function getAttachmentUrl(stored) {
  if (!useSupabase) return null;
  const result = await storageRequest(`object/sign/${bucket}/${encodePath(stored)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: 300 })
  });
  const signed = result?.signedURL;
  if (!signed) throw new Error('Could not create attachment URL');
  return signed.startsWith('http') ? signed : `${supabaseUrl}${signed}`;
}

export function localAttachmentPath(stored) {
  const root = path.resolve(localDir);
  const target = path.resolve(localDir, stored);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) return null;
  return target;
}

export async function deleteAttachment(stored, backend = 'supabase') {
  if (!stored) return;
  if (backend === 'supabase' && useSupabase) {
    await storageRequest('object/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefixes: [stored] })
    });
    return;
  }
  const target = localAttachmentPath(stored);
  if (target && fs.existsSync(target)) fs.unlinkSync(target);
}
