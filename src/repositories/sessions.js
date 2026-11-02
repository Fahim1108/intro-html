'use strict';

const crypto = require('node:crypto');
const db = require('../db');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createSession(adminId, ttlMs) {
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs).toISOString();

  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now.toISOString());
  db.prepare('INSERT INTO sessions (token_hash, admin_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .run(tokenHash, adminId, expiresAt, now.toISOString());

  return { token, expiresAt: new Date(expiresAt) };
}

function findSession(token) {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const row = db
    .prepare(`
      SELECT s.token_hash, s.expires_at, a.id AS admin_id, a.email
      FROM sessions s
      JOIN admins a ON a.id = s.admin_id
      WHERE s.token_hash = ?
    `)
    .get(tokenHash);

  if (!row) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
    return null;
  }

  return { admin: { id: Number(row.admin_id), email: row.email }, expiresAt: row.expires_at };
}

function deleteSession(token) {
  if (!token) return;
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
}

function deleteAllSessions(adminId, exceptToken) {
  if (exceptToken) {
    db.prepare('DELETE FROM sessions WHERE admin_id = ? AND token_hash != ?')
      .run(adminId, hashToken(exceptToken));
  } else {
    db.prepare('DELETE FROM sessions WHERE admin_id = ?').run(adminId);
  }
}

module.exports = { createSession, findSession, deleteSession, deleteAllSessions };
