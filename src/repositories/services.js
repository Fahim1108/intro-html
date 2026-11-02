'use strict';

const db = require('../db');
const { uniqueSlug } = require('../slug');

function listServices() {
  return db
    .prepare('SELECT id, name, slug, starting_price, description, display_order, website_type, created_at FROM services ORDER BY display_order ASC, id ASC')
    .all();
}

function getService(id) {
  return db.prepare('SELECT * FROM services WHERE id = ?').get(id) || null;
}

function createService(input) {
  const now = new Date().toISOString();
  const slug = uniqueSlug(db, 'services', input.name, 0, 'service');
  const nextOrder = db.prepare('SELECT COALESCE(MAX(display_order), 0) + 1 AS next FROM services').get().next;
  const result = db
    .prepare(`
      INSERT INTO services
        (name, slug, starting_price, description, display_order, website_type, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      input.name,
      slug,
      input.startingPrice,
      input.description || '',
      Number.isInteger(input.displayOrder) ? input.displayOrder : nextOrder,
      input.websiteType || 'Custom Website',
      now,
      now,
    );
  return getService(Number(result.lastInsertRowid));
}

function updateService(id, input) {
  const existing = getService(id);
  if (!existing) return null;
  const result = db
    .prepare(`
      UPDATE services SET
        name = ?, starting_price = ?, description = ?, display_order = ?, website_type = ?, updated_at = ?
      WHERE id = ?
    `)
    .run(
      input.name,
      input.startingPrice,
      input.description || '',
      Number.isInteger(input.displayOrder) ? input.displayOrder : existing.display_order,
      input.websiteType || existing.website_type,
      new Date().toISOString(),
      id,
    );
  return result.changes ? getService(id) : null;
}

function deleteService(id) {
  const existing = getService(id);
  if (!existing) return null;
  db.prepare('DELETE FROM services WHERE id = ?').run(id);
  return existing;
}

module.exports = { listServices, getService, createService, updateService, deleteService };
