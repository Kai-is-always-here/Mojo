import { Router } from 'express';
import crypto from 'node:crypto';
import { auth, allow } from '../middleware/auth.js';
import { db, save } from '../db.js';

const r = Router();
r.use(auth);
const commissionRate = 0.007;
const money = (n) => Math.round(Number(n) * 100) / 100;

function clientOf(id) { return db.clients.find(c => c.id === id); }
function orderView(o) { return { ...o, commissionRate, commissionAmount: money(o.amount * commissionRate) }; }

r.get('/client', allow('client'), (req, res) => {
  res.json(db.orders.filter(o => o.clientId === req.user.id).sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map(orderView));
});

r.post('/client', allow('client'), async (req, res) => {
  const amount = Number(req.body.amount);
  const title = String(req.body.title || 'Order').trim().slice(0, 160);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000000) return res.status(400).json({ error: 'Order amount must be greater than 0' });
  const c = clientOf(req.user.id);
  if (!c || c.status !== 'active') return res.status(403).json({ error: 'Client is not active' });
  const order = { id: crypto.randomUUID(), clientId: c.id, adminId: c.adminId, title, amount: money(amount), status: 'pending', commissionRate, commissionAmount: money(amount * commissionRate), commissionCredited: false, createdAt: new Date().toISOString(), completedAt: null };
  db.orders.push(order);
  await save();
  res.status(201).json(orderView(order));
});

r.get('/admin', allow('admin'), (req, res) => {
  res.json(db.orders.filter(o => o.adminId === req.user.id).sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map(orderView));
});

r.patch('/admin/:id', allow('admin'), async (req, res) => {
  const order = db.orders.find(o => o.id === req.params.id && o.adminId === req.user.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const next = String(req.body.status || '');
  if (!['pending', 'completed', 'cancelled'].includes(next)) return res.status(400).json({ error: 'Invalid order status' });
  if (order.status === 'completed' && next !== 'completed') return res.status(409).json({ error: 'Completed orders cannot be reversed' });
  if (next === 'completed' && !order.commissionCredited) {
    const client = clientOf(order.clientId);
    const user = db.users.find(u => u.id === order.clientId && u.role === 'client');
    if (!client || !user) return res.status(409).json({ error: 'Client record is unavailable' });
    const amount = money(order.amount * commissionRate);
    order.status = 'completed';
    order.completedAt = new Date().toISOString();
    order.commissionAmount = amount;
    order.commissionCredited = true;
    client.commissionBalance = money(Number(client.commissionBalance || 0) + amount);
    client.commissionTotal = money(Number(client.commissionTotal || 0) + amount);
    user.commissionBalance = client.commissionBalance;
    user.commissionTotal = client.commissionTotal;
    db.commissions.push({ id: crypto.randomUUID(), orderId: order.id, clientId: client.id, adminId: client.adminId, rate: commissionRate, amount, createdAt: order.completedAt });
  } else {
    order.status = next;
  }
  await save();
  res.json(orderView(order));
});

export default r;
