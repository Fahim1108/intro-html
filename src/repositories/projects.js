'use strict';

const db = require('../db');
const { uniqueSlug } = require('../slug');

const PUBLIC_FIELDS = `
  id, name, slug, category, description, cover_image, project_url, services, featured, created_at
`;

function getProject(id) {
  return db.prepare('SELECT * FROM projects WHERE id = ?').get(id) || null;
}

function listPublicProjects() {
  return db
    .prepare(`SELECT ${PUBLIC_FIELDS} FROM projects ORDER BY featured DESC, id ASC`)
    .all()
    .map((row) => ({ ...row, featured: Boolean(row.featured) }));
}

function listAdminProjects() {
  return db
    .prepare('SELECT * FROM projects ORDER BY featured DESC, id ASC')
    .all()
    .map((row) => ({ ...row, featured: Boolean(row.featured) }));
}

function createProject(input) {
  const now = new Date().toISOString();
  const slug = uniqueSlug(db, 'projects', input.name, 0, 'project');
  const result = db
    .prepare(`
      INSERT INTO projects
        (name, slug, category, description, cover_image, project_url, services, featured, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      input.name,
      slug,
      input.category,
      input.description,
      input.coverImage || null,
      input.projectUrl || '',
      input.services || '',
      input.featured ? 1 : 0,
      now,
      now,
    );
  return getProject(Number(result.lastInsertRowid));
}

function updateProject(id, input) {
  const existing = getProject(id);
  if (!existing) return null;
  const result = db
    .prepare(`
      UPDATE projects SET
        name = ?, category = ?, description = ?, cover_image = ?, project_url = ?,
        services = ?, featured = ?, updated_at = ?
      WHERE id = ?
    `)
    .run(
      input.name,
      input.category,
      input.description,
      input.coverImage === undefined ? existing.cover_image : input.coverImage,
      input.projectUrl || '',
      input.services || '',
      input.featured ? 1 : 0,
      new Date().toISOString(),
      id,
    );
  return result.changes ? getProject(id) : null;
}

function deleteProject(id) {
  const existing = getProject(id);
  if (!existing) return null;
  db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  return existing;
}

module.exports = {
  getProject,
  listPublicProjects,
  listAdminProjects,
  createProject,
  updateProject,
  deleteProject,
};
