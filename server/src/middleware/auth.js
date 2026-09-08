import jwt from 'jsonwebtoken';

export function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7).trim() : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'boxoffice-platform',
      audience: 'boxoffice-client'
    });
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export const allow = (...roles) => (req, res, next) => roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Forbidden' });
