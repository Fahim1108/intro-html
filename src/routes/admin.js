'use strict';

const express = require('express');
const admins = require('../repositories/admins');
const sessions = require('../repositories/sessions');
const inquiries = require('../repositories/inquiries');
const projects = require('../repositories/projects');
const services = require('../repositories/services');
const { authenticate, startSession, endSession, requireAdminApi, clearSessionCookie } = require('../auth');
const { verifyPassword } = require('../passwords');
const { sameOrigin, requireJson, loginLimiter, noStore } = require('../security');
const { saveProjectCover, removeProjectCover, coverUpload } = require('../upload');
const {
  loginSchema,
  accountSchema,
  statusSchema,
  projectSchema,
  serviceSchema,
  parse,
} = require('../validation');

const router = express.Router();
router.use(noStore);

function invalid(res, fields) {
  return res.status(400).json({ error: 'Please correct the highlighted fields.', fields });
}

function asBoolean(value) {
  return ['true', 'on', '1'].includes(String(value || '').toLowerCase());
}

function projectBody(req) {
  return {
    name: req.body?.name,
    category: req.body?.category,
    description: req.body?.description,
    services: req.body?.services,
    projectUrl: req.body?.projectUrl,
    featured: asBoolean(req.body?.featured),
  };
}

function withCover(handler) {
  return (req, res, next) => {
    coverUpload(req, res, (error) => {
      if (error) return next(error);
      Promise.resolve(handler(req, res, next)).catch(next);
    });
  };
}

/* ---------------- Session endpoints ---------------- */

router.post('/login', loginLimiter, sameOrigin, requireJson, (req, res) => {
  const validation = parse(loginSchema, req.body || {});
  if (!validation.success) return invalid(res, validation.fields);

  const admin = authenticate(validation.data.email, validation.data.password);
  if (!admin) {
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }

  startSession(res, admin);
  return res.json({ admin });
});

router.post('/logout', sameOrigin, (req, res) => {
  endSession(req, res);
  return res.status(204).end();
});

// Every authenticated mutation must come from the admin origin. SameSite
// cookies already help, but this rejects forged cross-origin fetch/form posts
// explicitly as defence in depth.
router.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  return sameOrigin(req, res, next);
});

router.use(requireAdminApi);

router.get('/me', (req, res) => {
  res.json({ admin: req.admin });
});

router.get('/stats', (_req, res) => {
  res.json({
    stats: inquiries.inquiryStats(),
    recent: inquiries.recentInquiries(7),
  });
});

/* ---------------- Inquiries ---------------- */

router.get('/inquiries', (req, res) => {
  const result = inquiries.listInquiries({
    search: String(req.query.search || '').slice(0, 120),
    status: String(req.query.status || ''),
    websiteType: String(req.query.type || ''),
    sort: req.query.sort === 'oldest' ? 'oldest' : 'newest',
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 20),
  });
  res.json(result);
});

router.get('/inquiries/:id', (req, res) => {
  const inquiry = inquiries.getInquiry(Number(req.params.id));
  if (!inquiry) return res.status(404).json({ error: 'Inquiry not found.' });
  return res.json({ inquiry });
});

router.patch('/inquiries/:id/status', requireJson, (req, res) => {
  const validation = parse(statusSchema, req.body || {});
  if (!validation.success) return invalid(res, validation.fields);
  const inquiry = inquiries.updateInquiryStatus(Number(req.params.id), validation.data.status);
  if (!inquiry) return res.status(404).json({ error: 'Inquiry not found.' });
  return res.json({ inquiry });
});

/* ---------------- Projects ---------------- */

router.get('/projects', (_req, res) => {
  res.json({ projects: projects.listAdminProjects() });
});

router.post('/projects', withCover(async (req, res) => {
  const validation = parse(projectSchema, projectBody(req));
  if (!validation.success) return invalid(res, validation.fields);

  let coverImage = null;
  try {
    if (req.file) coverImage = await saveProjectCover(req.file);
    const project = projects.createProject({ ...validation.data, coverImage });
    return res.status(201).json({ project });
  } catch (error) {
    if (coverImage) await removeProjectCover(coverImage);
    throw error;
  }
}));

router.patch('/projects/:id', withCover(async (req, res) => {
  const id = Number(req.params.id);
  const existing = projects.getProject(id);
  if (!existing) return res.status(404).json({ error: 'Project not found.' });

  const validation = parse(projectSchema, projectBody(req));
  if (!validation.success) return invalid(res, validation.fields);

  let coverImage;
  let newCover = null;
  try {
    if (req.file) {
      newCover = await saveProjectCover(req.file);
      coverImage = newCover;
    } else if (asBoolean(req.body?.removeCover)) {
      coverImage = null;
    }

    const project = projects.updateProject(id, { ...validation.data, coverImage });
    if (!project) {
      if (newCover) await removeProjectCover(newCover);
      return res.status(404).json({ error: 'Project not found.' });
    }
    if ((newCover || coverImage === null) && existing.cover_image) {
      await removeProjectCover(existing.cover_image);
    }
    return res.json({ project });
  } catch (error) {
    if (newCover) await removeProjectCover(newCover);
    throw error;
  }
}));

router.delete('/projects/:id', async (req, res) => {
  const project = projects.deleteProject(Number(req.params.id));
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  await removeProjectCover(project.cover_image);
  return res.status(204).end();
});

/* ---------------- Services ---------------- */

router.get('/services', (_req, res) => {
  res.json({ services: services.listServices() });
});

router.post('/services', requireJson, (req, res) => {
  const validation = parse(serviceSchema, req.body || {});
  if (!validation.success) return invalid(res, validation.fields);
  const service = services.createService(validation.data);
  return res.status(201).json({ service });
});

router.patch('/services/:id', requireJson, (req, res) => {
  const existing = services.getService(Number(req.params.id));
  if (!existing) return res.status(404).json({ error: 'Service not found.' });
  const validation = parse(serviceSchema, req.body || {});
  if (!validation.success) return invalid(res, validation.fields);
  const service = services.updateService(existing.id, {
    ...validation.data,
    websiteType: validation.data.websiteType || existing.website_type,
  });
  return res.json({ service });
});

router.delete('/services/:id', (req, res) => {
  const service = services.deleteService(Number(req.params.id));
  if (!service) return res.status(404).json({ error: 'Service not found.' });
  return res.status(204).end();
});

/* ---------------- Account ---------------- */

router.patch('/account', requireJson, (req, res) => {
  const validation = parse(accountSchema, req.body || {});
  if (!validation.success) return invalid(res, validation.fields);

  const current = admins.findById(req.admin.id);
  const stored = admins.findByEmail(req.admin.email);
  if (!stored || !verifyPassword(validation.data.currentPassword, stored.password_hash)) {
    return invalid(res, { currentPassword: 'Current password is incorrect.' });
  }

  try {
    const emailChanged = validation.data.email !== current.email;
    const passwordChanged = Boolean(validation.data.newPassword);

    if (emailChanged) admins.updateEmail(current.id, validation.data.email);
    if (passwordChanged) admins.updatePassword(current.id, validation.data.newPassword);

    if (passwordChanged) {
      sessions.deleteAllSessions(current.id);
      clearSessionCookie(res);
      return res.json({ signedOut: true });
    }

    return res.json({ admin: admins.findById(current.id) });
  } catch (error) {
    if (/UNIQUE constraint failed/i.test(error.message || '')) {
      return res.status(409).json({ error: 'That email address is already in use.', fields: { email: 'Already in use.' } });
    }
    throw error;
  }
});

module.exports = router;
