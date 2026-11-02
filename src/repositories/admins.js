'use strict';

const db = require('../db');
const { hashPassword } = require('../passwords');

function countAdmins() {
  return db.prepare('SELECT COUNT(*) AS count FROM admins').get().count;
}

function findByEmail(email) {
  return db
    .prepare('SELECT id, email, password_hash, created_at FROM admins WHERE email = ? COLLATE NOCASE')
    .get(String(email).trim().toLowerCase());
}

function findById(id) {
  return db.prepare('SELECT id, email, created_at FROM admins WHERE id = ?').get(id);
}

function createAdmin(email, password) {
  const now = new Date().toISOString();
  const result = db
    .prepare('INSERT INTO admins (email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?)')
    .run(String(email).trim().toLowerCase(), hashPassword(password), now, now);
  return findById(Number(result.lastInsertRowid));
}

function updateEmail(id, email) {
  const now = new Date().toISOString();
  db.prepare('UPDATE admins SET email = ?, updated_at = ? WHERE id = ?')
    .run(String(email).trim().toLowerCase(), now, id);
  return findById(id);
}

function updatePassword(id, password) {
  const now = new Date().toISOString();
  db.prepare('UPDATE admins SET password_hash = ?, updated_at = ? WHERE id = ?')
    .run(hashPassword(password), now, id);
}

module.exports = { countAdmins, findByEmail, findById, createAdmin, updateEmail, updatePassword };
