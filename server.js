'use strict';

const path = require('node:path');
const express = require('express');
const multer = require('multer');
const config = require('./src/config');
const db = require('./src/db');
const { seedAdminFromEnvironment } = require('./src/seed-admin');
const publicApi = require('./src/routes/public');
const adminApi = require('./src/routes/admin');
const { requireAdminPage, optionalAuth } = require('./src/auth');
const { securityHeaders, noStore } = require('./src/security');
const { UploadError } = require('./src/upload');

seedAdminFromEnvironment();

const app = express();
app.disable('x-powered-by');
if (config.trustProxy) app.set('trust proxy', 1);

app.use(securityHeaders());
app.use(express.json({ limit: '64kb' }));

app.use('/assets', express.static(path.join(config.root, 'assets'), {
  dotfiles: 'deny',
  etag: true,
  maxAge: config.isProduction ? '7d' : 0,
}));
app.use('/admin/assets', express.static(path.join(config.root, 'admin', 'assets'), {
  dotfiles: 'deny',
  etag: true,
  maxAge: config.isProduction ? '1h' : 0,
}));
app.use('/uploads', express.static(path.join(config.root, 'uploads'), {
  dotfiles: 'deny',
  etag: true,
  maxAge: config.isProduction ? '7d' : 0,
  setHeaders(res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
  },
}));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'needyoursite' });
});

app.use('/api/admin', adminApi);
app.use('/api', publicApi);

function sendPage(res, filename, { noIndex = false } = {}) {
  if (noIndex) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.sendFile(path.join(config.root, filename));
}

function sendAdminPage(page) {
  return (_req, res) => sendPage(res, path.join('admin', `${page}.html`), { noIndex: true });
}

app.get('/', (_req, res) => sendPage(res, 'index.html'));
app.get('/start', (_req, res) => sendPage(res, 'start.html'));
app.get('/favicon.ico', (_req, res) => res.redirect(308, '/assets/favicon.svg'));

app.get('/admin/login', optionalAuth, (req, res) => {
  if (req.admin) return res.redirect(302, '/admin');
  return sendPage(res, path.join('admin', 'login.html'), { noIndex: true });
});

app.get(['/admin', '/admin/'], requireAdminPage, sendAdminPage('index'));
app.get('/admin/inquiries', requireAdminPage, sendAdminPage('inquiries'));
app.get('/admin/projects', requireAdminPage, sendAdminPage('projects'));
app.get('/admin/services', requireAdminPage, sendAdminPage('services'));
app.get('/admin/settings', requireAdminPage, sendAdminPage('settings'));

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

app.use((req, res) => {
  if (req.accepts('html')) {
    return res.status(404).send('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found — NeedYourSite</title><body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#0b0d0b;color:#f3eee3;font:16px system-ui"><main><p style="letter-spacing:.14em;text-transform:uppercase;font-size:11px;color:#e8502a">NeedYourSite / 404</p><h1 style="font-size:clamp(2.5rem,8vw,5rem);line-height:.9;margin:1rem 0">Page not found.</h1><p><a href="/" style="color:#e8502a">Return home ↗</a></p></main></body></html>');
  }
  res.status(404).json({ error: 'Not found.' });
});

app.use((error, req, res, _next) => {
  if (res.headersSent) return;

  let status = Number(error.status) || 500;
  let message = status >= 500 ? 'Something went wrong. Please try again.' : error.message;
  let fields;

  if (error instanceof multer.MulterError) {
    status = 400;
    message = error.code === 'LIMIT_FILE_SIZE' ? 'Cover images must be 5 MB or smaller.' : 'The upload could not be processed.';
  } else if (error instanceof UploadError) {
    status = 400;
    message = error.message;
  } else if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    status = 400;
    message = 'The request body is not valid JSON.';
  } else if (error.fields) {
    fields = error.fields;
  }

  if (status >= 500) console.error('[server]', error);

  if (req.path.startsWith('/api/')) {
    return res.status(status).json({ error: message, ...(fields ? { fields } : {}) });
  }
  return res.status(status).type('text/plain').send(message);
});

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`[server] NeedYourSite listening on http://0.0.0.0:${config.port}`);
});

function shutdown(signal) {
  console.log(`[server] ${signal} received, shutting down.`);
  server.close(() => {
    try { db.close(); } catch {}
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => console.error('[server] Unhandled rejection:', reason));
