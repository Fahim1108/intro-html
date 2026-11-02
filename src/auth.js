'use strict';

const config = require('./config');
const admins = require('./repositories/admins');
const sessions = require('./repositories/sessions');
const { verifyPassword, hashPassword } = require('./passwords');

const DUMMY_HASH = hashPassword('need-your-site-dummy-password');

function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  for (const pair of header.split(';')) {
    const index = pair.indexOf('=');
    if (index < 0) continue;
    const key = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    if (!key) continue;
    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
  }
  return cookies;
}

function tokenFromRequest(req) {
  return parseCookies(req.headers.cookie)[config.sessionCookie] || '';
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.isProduction,
    path: '/',
    maxAge: config.sessionTtlMs,
  };
}

function setSessionCookie(res, token, expiresAt) {
  res.cookie(config.sessionCookie, token, {
    ...cookieOptions(),
    expires: expiresAt,
  });
}

function clearSessionCookie(res) {
  res.clearCookie(config.sessionCookie, {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.isProduction,
    path: '/',
  });
}

function authenticate(email, password) {
  const admin = admins.findByEmail(email);
  const hash = admin ? admin.password_hash : DUMMY_HASH;
  const valid = verifyPassword(String(password || ''), hash);
  if (!valid || !admin) return null;
  return { id: Number(admin.id), email: admin.email };
}

function startSession(res, admin) {
  const session = sessions.createSession(admin.id, config.sessionTtlMs);
  setSessionCookie(res, session.token, session.expiresAt);
  return session;
}

function currentSession(req) {
  const token = tokenFromRequest(req);
  if (!token) return null;
  const session = sessions.findSession(token);
  if (!session) return null;
  return { ...session, token };
}

function optionalAuth(req, _res, next) {
  const session = currentSession(req);
  req.admin = session ? session.admin : null;
  req.sessionToken = session ? session.token : '';
  next();
}

function requireAdminApi(req, res, next) {
  const session = currentSession(req);
  if (!session) return res.status(401).json({ error: 'Authentication required.' });
  req.admin = session.admin;
  req.sessionToken = session.token;
  next();
}

function requireAdminPage(req, res, next) {
  const session = currentSession(req);
  if (!session) {
    const nextPath = encodeURIComponent(req.originalUrl.startsWith('/admin') ? req.originalUrl : '/admin');
    return res.redirect(302, `/admin/login?next=${nextPath}`);
  }
  req.admin = session.admin;
  req.sessionToken = session.token;
  next();
}

function endSession(req, res) {
  const token = tokenFromRequest(req);
  if (token) sessions.deleteSession(token);
  clearSessionCookie(res);
}

module.exports = {
  authenticate,
  startSession,
  endSession,
  optionalAuth,
  requireAdminApi,
  requireAdminPage,
  tokenFromRequest,
  clearSessionCookie,
};
