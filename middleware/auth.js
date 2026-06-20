const jwt = require('jsonwebtoken');

// Requires a valid "Authorization: Bearer <token>" header.
// On success, attaches req.userId and req.username.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing auth token' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    req.username = payload.username;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Like requireAuth, but doesn't reject the request if no/invalid token is present —
// just leaves req.userId undefined. Useful for routes that work for guests too.
function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    req.username = payload.username;
  } catch (e) { /* ignore invalid token, treat as guest */ }
  next();
}

module.exports = { requireAuth, optionalAuth };
