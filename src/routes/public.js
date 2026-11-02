'use strict';

const express = require('express');
const projects = require('../repositories/projects');
const services = require('../repositories/services');
const inquiries = require('../repositories/inquiries');
const { inquirySchema, parse } = require('../validation');
const { sameOrigin, requireJson, inquiryLimiter, noStore } = require('../security');

const router = express.Router();

router.use(noStore);

router.get('/projects', (_req, res) => {
  res.json({ projects: projects.listPublicProjects() });
});

router.get('/services', (_req, res) => {
  res.json({ services: services.listServices() });
});

router.post('/inquiries', sameOrigin, inquiryLimiter, requireJson, (req, res, next) => {
  const result = parse(inquirySchema, req.body || {});
  if (!result.success) {
    return res.status(400).json({
      error: 'Please correct the highlighted fields.',
      fields: result.fields,
    });
  }

  try {
    const created = inquiries.createInquiry(result.data);
    return res.status(created.duplicate ? 200 : 201).json({
      inquiry: {
        id: created.inquiry.id,
        reference: created.inquiry.reference,
        status: created.inquiry.status,
        createdAt: created.inquiry.created_at,
      },
      duplicate: created.duplicate,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
