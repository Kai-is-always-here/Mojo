import { Router } from 'express';
import crypto from 'node:crypto';
import express from 'express';
import { auth, allow } from '../middleware/auth.js';
import { db, save } from '../db.js';
import { storeAttachment, getAttachmentUrl, localAttachmentPath, deleteAttachment } from '../services/storage.js';
import fs from 'node:fs';

const r = Router();
const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'text/plain', 'application/zip', 'application/x-zip-compressed']);
const maxBytes = 8 * 1024 * 1024;
const safeText = (value) => String(value || '').trim().slice(0, 10000);

function attachmentFrom(body) {
  if (!body?.fileData) return null;
  const match = String(body.fileData).match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) throw new Error('Invalid attachment');
  const mime = match[1].toLowerCase();
  if (!allowed.has(mime)) throw new Error('Unsupported file type');
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > maxBytes) throw new Error('File too large. Maximum 8 MB.');
  return { buffer, mime, name: String(body.fileName || 'file').slice(0, 160) };
}

function threadForClient(clientId) {
  const c = db.clients.find(x => x.id === clientId);
  return c ? db.messages.filter(m => m.adminId === c.adminId && m.clientId === clientId) : [];
}

r.use(auth);
r.get('/file/:id', async (req, res) => {
  const m = db.messages.find(x => x.id === req.params.id);
  if (!m?.attachment?.stored) return res.status(404).json({ error: 'Attachment not found' });
  if (req.user.role === 'client' && m.clientId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  if (req.user.role === 'admin' && m.adminId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  if (!['owner', 'admin', 'client'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  try {
    if (m.attachment.backend === 'supabase') {
      const url = await getAttachmentUrl(m.attachment.stored);
      return res.redirect(302, url);
    }
    const file = localAttachmentPath(m.attachment.stored);
    if (!file || !fs.existsSync(file)) return res.status(404).json({ error: 'Attachment not found' });
    res.type(m.attachment.mime);
    return res.download(file, m.attachment.name, { dotfiles: 'deny' });
  } catch (error) {
    return res.status(502).json({ error: 'Attachment service unavailable' });
  }
});

async function createMessage(req, res, role) {
  const isAdmin = role === 'admin';
  const clientId = isAdmin ? String(req.body.clientId || '') : req.user.id;
  const c = db.clients.find(x => x.id === clientId && (isAdmin ? x.adminId === req.user.id : true));
  if (!c) return res.status(404).json({ error: 'Client not found' });
  const text = safeText(req.body.text);
  if (!text && !req.body.fileData) return res.status(400).json({ error: 'Message or attachment required' });
  try {
    const incoming = attachmentFrom(req.body);
    const attachment = incoming ? await storeAttachment({ ...incoming, ownerId: `${c.adminId}/${c.id}` }) : null;
    const m = { id: crypto.randomUUID(), adminId: c.adminId, clientId, fromRole: role, text, attachment, createdAt: new Date().toISOString() };
    db.messages.push(m);
    await save();
    return res.status(201).json(m);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

r.get('/admin', allow('admin'), (req, res) => {
  const clientId = String(req.query.clientId || '');
  if (!clientId) return res.json([]);
  const c = db.clients.find(x => x.id === clientId && x.adminId === req.user.id);
  if (!c) return res.status(404).json({ error: 'Client not found' });
  res.json(threadForClient(clientId));
});
r.post('/admin', allow('admin'), express.json({ limit: '11mb' }), (req, res) => createMessage(req, res, 'admin'));
r.get('/client', allow('client'), (req, res) => res.json(threadForClient(req.user.id)));
r.post('/client', allow('client'), express.json({ limit: '11mb' }), (req, res) => createMessage(req, res, 'client'));

export default r;
