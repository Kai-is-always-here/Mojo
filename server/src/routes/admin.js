import { Router } from 'express';
import { auth, allow } from '../middleware/auth.js';
import { db, save } from '../db.js';
const r = Router();
r.use(auth, allow('admin'));
r.get('/clients', (req, res) => res.json(db.clients.filter(c => c.adminId === req.user.id)));
r.patch('/clients/:id', async (req, res) => { const c = db.clients.find(x => x.id === req.params.id && x.adminId === req.user.id); if (!c) return res.status(404).json({ error: 'Client not found' }); const status = req.body.status ?? c.status; const creditScore = Number(req.body.creditScore ?? c.creditScore); if (!['active', 'suspended', 'deleted'].includes(status)) return res.status(400).json({ error: 'Invalid status' }); if (!Number.isInteger(creditScore) || creditScore < 0 || creditScore > 1000000) return res.status(400).json({ error: 'Invalid credit score' }); Object.assign(c, { status, creditScore }); const u = db.users.find(x => x.id === c.id); if (u) Object.assign(u, { status, creditScore }); await save(); res.json(c); });
export default r;
