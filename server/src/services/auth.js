import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { db, save } from '../db.js';

const id = () => crypto.randomUUID();
const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const normalizePhone = (value) => String(value || '').trim().replace(/[\s()-]/g, '');
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export function sign(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '8h', issuer: 'boxoffice-platform', audience: 'boxoffice-client' }
  );
}

export function verifyPasswordPolicy(password, field = 'Password') {
  if (typeof password !== 'string' || password.length < 10 || password.length > 128) {
    throw new Error(`${field} must be between 10 and 128 characters`);
  }
}

export async function login(email, password, role) {
  const key = normalizeEmail(email);
  const u = db.users.find(x => x.role === role && ((x.email || '').toLowerCase() === key || normalizePhone(x.phone) === key));
  if (!u || u.status !== 'active' || !(await bcrypt.compare(String(password || ''), u.passwordHash))) return null;
  return { token: sign(u), user: { id: u.id, name: u.name, email: u.email, role: u.role } };
}

function nextInviteCode() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const code = crypto.randomInt(10000, 100000).toString();
    if (!db.users.some(u => u.inviteCode === code)) return code;
  }
  throw new Error('Could not allocate a unique invitation code');
}

export async function createAdmin({ name, email, password }) {
  const cleanName = String(name || '').trim().slice(0, 80);
  const cleanEmail = normalizeEmail(email);
  verifyPasswordPolicy(password);
  if (cleanName.length < 2) throw new Error('Name is required');
  if (!validEmail(cleanEmail)) throw new Error('Valid email is required');
  if (db.users.some(u => normalizeEmail(u.email) === cleanEmail)) throw new Error('Email already exists');
  const invite = nextInviteCode();
  const u = { id: id(), role: 'admin', name: cleanName, email: cleanEmail, passwordHash: await bcrypt.hash(password, 12), status: 'active', inviteCode: invite, createdAt: new Date().toISOString() };
  db.users.push(u);
  db.admins.push({ id: u.id, name: cleanName, email: cleanEmail, inviteCode: invite, status: 'active', clientCount: 0, createdAt: u.createdAt });
  await save();
  return { id: u.id, name: cleanName, email: cleanEmail, inviteCode: invite };
}

export async function createClient({ name, phone, password, withdrawalPassword, inviteCode }) {
  const cleanName = String(name || '').trim().slice(0, 80);
  const cleanPhone = normalizePhone(phone);
  const cleanCode = String(inviteCode || '').trim();
  verifyPasswordPolicy(password);
  verifyPasswordPolicy(withdrawalPassword, 'Withdrawal password');
  if (cleanName.length < 2) throw new Error('Name is required');
  if (!/^\+?[0-9]{7,20}$/.test(cleanPhone)) throw new Error('Valid phone number is required');
  if (!/^\d{5}$/.test(cleanCode)) throw new Error('Invitation code must be 5 digits');
  // A code can belong to an Admin or to an existing Client.
  // When a Client code is used, the new Client inherits that Client's Admin.
  const codeOwner = db.users.find(u => u.inviteCode === cleanCode && u.status === 'active' && (u.role === 'admin' || u.role === 'client'));
  if (!codeOwner) throw new Error('Invalid invitation code');
  const adminId = codeOwner.role === 'admin' ? codeOwner.id : codeOwner.adminId;
  if (!adminId) throw new Error('Invitation code has no active Admin assignment');
  const admin = db.users.find(u => u.id === adminId && u.role === 'admin' && u.status === 'active');
  if (!admin) throw new Error('Invitation code is no longer active');
  if (db.users.some(u => normalizePhone(u.phone) === cleanPhone)) throw new Error('Phone number already exists');
  const clientInvite = nextInviteCode();
  const now = new Date().toISOString();
  const u = { id: id(), role: 'client', name: cleanName, phone: cleanPhone, passwordHash: await bcrypt.hash(password, 12), withdrawalPasswordHash: await bcrypt.hash(withdrawalPassword, 12), adminId, invitedByClientId: codeOwner.role === 'client' ? codeOwner.id : null, inviteCode: clientInvite, status: 'active', creditScore: 1000, commissionBalance: 0, commissionTotal: 0, createdAt: now };
  db.users.push(u);
  db.clients.push({ id: u.id, name: cleanName, phone: cleanPhone, adminId, invitedByClientId: u.invitedByClientId, inviteCode: clientInvite, status: 'active', creditScore: 1000, commissionBalance: 0, commissionTotal: 0, createdAt: now });
  const a = db.admins.find(x => x.id === adminId);
  if (a) a.clientCount = (a.clientCount || 0) + 1;
  await save();
  return { id: u.id, name: cleanName, phone: cleanPhone, adminId, invitedByClientId: u.invitedByClientId, inviteCode: clientInvite };
}
