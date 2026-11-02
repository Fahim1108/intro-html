'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const config = require('./config');

function inlineScriptHashes() {
  try {
    const html = fs.readFileSync(path.join(config.root, 'index.html'), 'utf8');
    const hashes = [];
    const pattern = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = pattern.exec(html))) {
      if (match[1].trim()) {
        hashes.push(`'sha256-${crypto.createHash('sha256').update(match[1]).digest('base64')}'`);
      }
    }
    return hashes;
  } catch {
    return [];
  }
}

function securityHeaders() {
  return helmet({
    hsts: config.isProduction ? undefined : false,
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        scriptSrc: ["'self'", ...inlineScriptHashes()],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'"],
        styleSrcAttr: ["'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        mediaSrc: ["'none'"],
        workerSrc: ["'none'"],
        manifestSrc: ["'self'"],
        upgradeInsecureRequests: config.isProduction ? [] : null,
      },
    },
  });
}

function sameOrigin(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const origin = req.get('origin');
  if (!origin) return next();

  let originHost;
  try {
    originHost = new URL(origin).host;
  } catch {
    return res.status(403).json({ error: 'Request origin could not be verified.' });
  }

  if (config.appOrigin) {
    try {
      if (origin === config.appOrigin) return next();
    } catch {
      // Fall through to host comparison.
    }
  }

  const requestHost = req.get('x-forwarded-host') || req.get('host');
  if (originHost !== requestHost) {
    return res.status(403).json({ error: 'Request origin is not allowed.' });
  }
  return next();
}

function requireJson(req, res, next) {
  if (!req.is('application/json')) {
    return res.status(415).json({ error: 'This endpoint expects a JSON request body.' });
  }
  return next();
}

const inquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 6,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many inquiries from this connection. Please try again in a few minutes.' },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Too many sign-in attempts. Please wait a few minutes and try again.' },
});

function noStore(_req, res, next) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  next();
}

module.exports = {
  securityHeaders,
  sameOrigin,
  requireJson,
  inquiryLimiter,
  loginLimiter,
  noStore,
};
