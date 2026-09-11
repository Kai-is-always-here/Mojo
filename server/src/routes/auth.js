import { Router } from 'express';
import { login, createAdmin, createClient } from '../services/auth.js';
import { auth, allow } from '../middleware/auth.js';
const r = Router();
r.post('/login', async (req, res) => { try { const out = await login(req.body.email || '', req.body.password || '', req.body.role || 'client'); if (!out) return res.status(401).json({ error: 'Invalid credentials' }); res.json(out); } catch (e) { res.status(400).json({ error: e.message }); } });
r.post('/register-client', async (req, res) => { try { res.status(201).json(await createClient(req.body)); } catch (e) { res.status(400).json({ error: e.message }); } });
r.post('/admins', auth, allow('owner'), async (req, res) => { try { res.status(201).json(await createAdmin(req.body)); } catch (e) { res.status(400).json({ error: e.message }); } });
r.get('/me', auth, (req, res) => res.json({ user: req.user }));
export default r;
