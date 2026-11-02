'use strict';

const { z } = require('zod');
const { WEBSITE_TYPES, BUDGET_RANGES, INQUIRY_STATUSES } = require('./constants');

function cleanText(value) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .trim();
}

const requiredText = (min, max) =>
  z.string().transform(cleanText).pipe(z.string().min(min).max(max));

const optionalText = (max) =>
  z.string().optional().transform((value) => cleanText(value)).pipe(z.string().max(max));

const email = z
  .string()
  .transform((value) => cleanText(value).toLowerCase())
  .pipe(z.string().email().max(254));

const phone = z
  .string()
  .transform(cleanText)
  .pipe(z.string().min(7).max(24))
  .refine((value) => /^[+0-9()\-\s.]+$/.test(value) && (value.match(/\d/g) || []).length >= 7, {
    message: 'Enter a valid phone or WhatsApp number.',
  });

const inquirySchema = z.object({
  fullName: requiredText(2, 120),
  email,
  phone,
  businessName: optionalText(120),
  websiteType: z.enum(WEBSITE_TYPES),
  budgetRange: z.enum(BUDGET_RANGES),
  description: requiredText(20, 4000),
  submissionKey: z.string().trim().min(16).max(80).regex(/^[A-Za-z0-9_-]+$/),
});

const statusSchema = z.object({
  status: z.enum(INQUIRY_STATUSES),
});

const projectUrlSchema = z
  .string()
  .optional()
  .transform((value) => cleanText(value))
  .pipe(z.string().max(500))
  .refine((value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }, { message: 'Project URL must start with http:// or https://.' });

const projectSchema = z.object({
  name: requiredText(2, 100),
  category: requiredText(2, 100),
  description: requiredText(10, 1500),
  services: optionalText(300),
  projectUrl: projectUrlSchema,
  featured: z.boolean(),
});

const serviceSchema = z.object({
  name: requiredText(2, 80),
  startingPrice: z.coerce.number().int().min(0).max(10000000),
  description: optionalText(500),
  displayOrder: z.coerce.number().int().min(0).max(10000).optional(),
  websiteType: z.enum(WEBSITE_TYPES).optional(),
});

const loginSchema = z.object({
  email,
  password: z.string().min(1).max(200),
});

const accountSchema = z.object({
  email,
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().max(200).optional(),
}).refine((value) => !value.newPassword || value.newPassword.length >= 12, {
  message: 'A new password must be at least 12 characters.',
  path: ['newPassword'],
});

function parse(schema, value) {
  const result = schema.safeParse(value);
  if (result.success) return { success: true, data: result.data };
  const fields = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] || 'form';
    if (!fields[key]) fields[key] = issue.message;
  }
  return { success: false, fields };
}

module.exports = {
  inquirySchema,
  statusSchema,
  projectSchema,
  serviceSchema,
  loginSchema,
  accountSchema,
  parse,
  cleanText,
};
