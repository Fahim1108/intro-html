'use strict';

require('dotenv').config();

const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const isProduction = process.env.NODE_ENV === 'production';
const resolveFromRoot = (value, fallback) => path.resolve(ROOT, value || fallback);

const config = {
  root: ROOT,
  isProduction,
  port: Number(process.env.PORT || 3001),
  appOrigin: (process.env.APP_ORIGIN || '').trim().replace(/\/$/, ''),
  trustProxy: process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY === 'true',
  dbPath: resolveFromRoot(process.env.DATABASE_PATH, 'data/needyoursite.db'),
  uploadDir: resolveFromRoot(process.env.UPLOAD_DIR, 'uploads/projects'),
  sessionCookie: 'nys_admin_session',
  sessionTtlMs: 8 * 60 * 60 * 1000,
  adminEmail: (process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD || '',
  maxUploadBytes: 5 * 1024 * 1024,
  isConfiguredForAdmin: Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD),
};

module.exports = config;
