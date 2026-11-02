'use strict';

function slugify(value, fallback = 'item') {
  const slug = String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/g, '');
  return slug || fallback;
}

function uniqueSlug(db, table, value, excludeId, fallback) {
  if (!['projects', 'services'].includes(table)) throw new Error('Invalid slug table');
  const base = slugify(value, fallback);
  let candidate = base;
  let index = 2;
  const query = `SELECT id FROM ${table} WHERE slug = ? AND id != ?`;
  while (db.prepare(query).get(candidate, excludeId || 0)) {
    candidate = `${base}-${index}`;
    index += 1;
    if (index > 1000) throw new Error('Could not create a unique slug');
  }
  return candidate;
}

module.exports = { slugify, uniqueSlug };
