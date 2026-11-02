'use strict';

const db = require('../db');
const { INQUIRY_STATUSES } = require('../constants');

function referenceFor(id) {
  return `NYS-${String(id).padStart(6, '0')}`;
}

function toPublic(row) {
  if (!row) return null;
  return { ...row, reference: referenceFor(row.id) };
}

function createInquiry(input) {
  const now = new Date().toISOString();
  try {
    const result = db
      .prepare(`
        INSERT INTO inquiries
          (full_name, email, phone, business_name, website_type, budget_range, description, status, submission_key, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'NEW', ?, ?, ?)
      `)
      .run(
        input.fullName,
        input.email,
        input.phone,
        input.businessName || '',
        input.websiteType,
        input.budgetRange,
        input.description,
        input.submissionKey,
        now,
        now,
      );

    return { inquiry: toPublic(getInquiry(Number(result.lastInsertRowid))), duplicate: false };
  } catch (error) {
    if (String(error && error.code).includes('SQLITE_CONSTRAINT') || /UNIQUE constraint failed/i.test(error.message || '')) {
      const existing = db.prepare('SELECT * FROM inquiries WHERE submission_key = ?').get(input.submissionKey);
      if (existing) return { inquiry: toPublic(existing), duplicate: true };
    }
    throw error;
  }
}

function getInquiry(id) {
  return db.prepare('SELECT * FROM inquiries WHERE id = ?').get(id) || null;
}

function escapeLike(value) {
  return String(value).replace(/[!%_]/g, '!$&');
}

function listInquiries({ search = '', status = '', websiteType = '', sort = 'newest', page = 1, limit = 20 } = {}) {
  const where = [];
  const params = [];

  if (search) {
    const pattern = `%${escapeLike(search)}%`;
    where.push(`(
      full_name LIKE ? ESCAPE '!' OR
      email LIKE ? ESCAPE '!' OR
      business_name LIKE ? ESCAPE '!' OR
      phone LIKE ? ESCAPE '!'
    )`);
    params.push(pattern, pattern, pattern, pattern);
  }
  if (INQUIRY_STATUSES.includes(status)) {
    where.push('status = ?');
    params.push(status);
  }
  if (websiteType) {
    where.push('website_type = ?');
    params.push(websiteType);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderSql = sort === 'oldest' ? 'ORDER BY created_at ASC, id ASC' : 'ORDER BY created_at DESC, id DESC';
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const offset = (safePage - 1) * safeLimit;

  const total = db.prepare(`SELECT COUNT(*) AS count FROM inquiries ${whereSql}`).get(...params).count;
  const rows = db
    .prepare(`SELECT * FROM inquiries ${whereSql} ${orderSql} LIMIT ? OFFSET ?`)
    .all(...params, safeLimit, offset)
    .map(toPublic);

  return {
    items: rows,
    total,
    page: safePage,
    limit: safeLimit,
    pages: Math.max(Math.ceil(total / safeLimit), 1),
  };
}

function recentInquiries(limit = 6) {
  return db
    .prepare('SELECT * FROM inquiries ORDER BY created_at DESC, id DESC LIMIT ?')
    .all(limit)
    .map(toPublic);
}

function inquiryStats() {
  const row = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'NEW' THEN 1 ELSE 0 END) AS new_count,
      SUM(CASE WHEN status = 'CONTACTED' THEN 1 ELSE 0 END) AS contacted,
      SUM(CASE WHEN status = 'IN DISCUSSION' THEN 1 ELSE 0 END) AS in_discussion,
      SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END) AS confirmed,
      SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected
    FROM inquiries
  `).get();

  return {
    total: Number(row.total || 0),
    new: Number(row.new_count || 0),
    contacted: Number(row.contacted || 0),
    inDiscussion: Number(row.in_discussion || 0),
    confirmed: Number(row.confirmed || 0),
    rejected: Number(row.rejected || 0),
  };
}

function updateInquiryStatus(id, status) {
  if (!INQUIRY_STATUSES.includes(status)) throw new Error('Invalid inquiry status');
  const result = db
    .prepare('UPDATE inquiries SET status = ?, updated_at = ? WHERE id = ?')
    .run(status, new Date().toISOString(), id);
  if (!result.changes) return null;
  return toPublic(getInquiry(id));
}

module.exports = {
  createInquiry,
  getInquiry: (id) => toPublic(getInquiry(id)),
  listInquiries,
  recentInquiries,
  inquiryStats,
  updateInquiryStatus,
  referenceFor,
};
