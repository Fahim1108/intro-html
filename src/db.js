'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const config = require('./config');

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
fs.mkdirSync(config.uploadDir, { recursive: true });

const db = new DatabaseSync(config.dbPath);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;

  CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);

  CREATE TABLE IF NOT EXISTS inquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    business_name TEXT NOT NULL DEFAULT '',
    website_type TEXT NOT NULL,
    budget_range TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'NEW'
      CHECK (status IN ('NEW', 'CONTACTED', 'IN DISCUSSION', 'CONFIRMED', 'REJECTED')),
    submission_key TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_inquiries_created ON inquiries(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
  CREATE INDEX IF NOT EXISTS idx_inquiries_type ON inquiries(website_type);

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    cover_image TEXT,
    project_url TEXT NOT NULL DEFAULT '',
    services TEXT NOT NULL DEFAULT '',
    featured INTEGER NOT NULL DEFAULT 1 CHECK (featured IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_projects_featured ON projects(featured DESC, id ASC);

  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    starting_price INTEGER NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    display_order INTEGER NOT NULL DEFAULT 0,
    website_type TEXT NOT NULL DEFAULT 'Custom Website',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_services_order ON services(display_order ASC, id ASC);
`);

function seedContent() {
  // Seed once, on a fresh database. Emptying the portfolio or services in the
  // admin must stay empty after a restart; it must not resurrect demo content.
  const seeded = db.prepare("SELECT value FROM app_meta WHERE key = 'content_seeded_v1'").get();
  if (seeded) return;

  const now = new Date().toISOString();
  const projectCount = db.prepare('SELECT COUNT(*) AS count FROM projects').get().count;

  if (projectCount === 0) {
    const insert = db.prepare(`
      INSERT INTO projects
        (name, slug, category, description, cover_image, project_url, services, featured, created_at, updated_at)
      VALUES (?, ?, ?, ?, NULL, ?, ?, 1, ?, ?)
    `);

    const projects = [
      [
        'Smile Studio',
        'smile-studio',
        'Dental chamber / Chattogram / 2026',
        'A chamber that felt warm in person but clinical online. We rebuilt the first impression around calm language, clear treatments and a booking flow that works after hours.',
        'https://smilestudio.com.bd',
        'Design / Development / Mobile UX',
      ],
      [
        'Kettle & Co.',
        'kettle-co',
        'E-commerce / Dhaka / 2026',
        'A ceramics studio selling through DMs and screenshots. The new store gives every piece a proper page, a simple cart and a checkout that feels as quiet as the work itself.',
        'https://kettleandco.com',
        'E-commerce / Art direction / Mobile UX',
      ],
      [
        'Nusrat Rahman',
        'nusrat-rahman',
        'Portfolio / Dhaka / 2025',
        "Portraits, weddings and quiet moments. We gave the work a single, confident home with large images, a short story and an enquiry path that doesn't interrupt the looking.",
        'https://nusratrahman.studio',
        'Portfolio / Editorial / Mobile UX',
      ],
    ];

    for (const project of projects) {
      insert.run(...project, now, now);
    }
  }

  const serviceCount = db.prepare('SELECT COUNT(*) AS count FROM services').get().count;
  if (serviceCount === 0) {
    const insert = db.prepare(`
      INSERT INTO services
        (name, slug, starting_price, description, display_order, website_type, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const services = [
      ['Portfolio', 'portfolio', 5000, 'A focused home for your work, story and enquiry path.', 1, 'Portfolio Website'],
      ['Business', 'business', 10000, 'A credible multi-section website for a service business.', 2, 'Business Website'],
      ['E-commerce', 'ecommerce', 15000, 'A considered store with products, cart and checkout.', 3, 'E-commerce Website'],
      ['Hospital / Clinic', 'hospital-clinic', 15000, 'Departments, doctors and appointment paths, clearly organised.', 4, 'Hospital / Clinic Website'],
      ['Dental Chamber', 'dental-chamber', 10000, 'Treatments, trust and a simple booking path.', 5, 'Dental Chamber Website'],
      ['Personal Brand', 'personal-brand', 5000, 'A sharp personal site that sounds like you.', 6, 'Personal Brand Website'],
      ['Education', 'education', 10000, 'Courses, admissions and faculty, without the clutter.', 7, 'Educational Website'],
      ['Custom Build', 'custom-build', 25000, 'Something bigger, stranger or more specific.', 8, 'Custom Website'],
    ];

    for (const service of services) {
      insert.run(...service, now, now);
    }
  }

  db.prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('content_seeded_v1', ?)").run(now);
}

seedContent();

module.exports = db;
