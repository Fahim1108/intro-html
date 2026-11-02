# NeedYourSite

A full-stack version of the NeedYourSite studio site: the existing public design plus a secure admin workspace for project inquiries, portfolio publishing and service pricing.

## Stack

- Node.js 22.13+ / Express 5
- SQLite through Node's built-in `node:sqlite` (no native database dependency)
- Vanilla HTML, CSS and JavaScript on both the public site and admin dashboard
- `zod` validation, `helmet` security headers, `express-rate-limit`, scrypt password hashing and opaque database-backed sessions

## Run locally

```bash
npm ci
cp .env.example .env
```

Edit `.env` and set a real `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD` (at least 10 characters). The admin account is created only when the database has no admin yet.

```bash
npm start
```

Open `http://localhost:3001/`. The admin workspace is at `http://localhost:3001/admin/login`.

For development with automatic restarts:

```bash
npm run dev
```

## Environment

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port, default `3001` |
| `NODE_ENV` | Set to `production` in production. Enables secure session cookies. |
| `APP_ORIGIN` | Public origin, e.g. `https://needyoursite.com`. Used for origin checks. |
| `ADMIN_EMAIL` | Bootstrap admin email. Only used while no admin exists. |
| `ADMIN_PASSWORD` | Bootstrap admin password. Only used while no admin exists. |
| `TRUST_PROXY` | Set to `1` only behind one trusted reverse proxy. |
| `DATABASE_PATH` | Optional SQLite path, default `data/needyoursite.db`. |
| `UPLOAD_DIR` | Optional project-cover directory, default `uploads/projects`. |

Never commit `.env`. Database files, WAL files and uploaded covers are ignored by Git.

## Public routes

- `/` — existing studio homepage, with services and portfolio hydrated from the database
- `/start` — project inquiry form
- `/api/projects`, `/api/services` — public read APIs
- `POST /api/inquiries` — validated, rate-limited inquiry submission

Project and service changes made in the admin appear on the public site after the next page load. The static markup remains a fallback if the content APIs are unavailable.

## Admin routes

| Route | Purpose |
| --- | --- |
| `/admin/login` | Sign in |
| `/admin` | Dashboard overview and recent inquiries |
| `/admin/inquiries` | Search, filter, sort, view and update inquiry status |
| `/admin/projects` | Portfolio CRUD with cover uploads and featuring |
| `/admin/services` | Add, edit, delete and reorder services and starting prices |
| `/admin/settings` | Change admin email/password and sign out |

All admin pages and admin APIs are protected by a server-side session. Unauthenticated page requests redirect to `/admin/login`; unauthenticated API requests return `401`.

## Data and uploads

- SQLite schema and initial demo content: `src/db.js`
- Inquiry statuses and exact website/budget options: `src/constants.js`
- Project covers: JPG, PNG or WebP, maximum 5 MB, validated by magic bytes and stored with random names under `uploads/projects/`
- Admin password changes invalidate all sessions. Change the bootstrap password after the first sign-in.

Initial projects and services are seeded once. Deleting them in the admin is permanent across restarts; they are not recreated.

## Backend layout

```text
server.js                 Express app, headers, static files and page routes
src/config.js             Environment and paths
src/db.js                 Schema, migrations and one-time seeds
src/auth.js               Sessions, cookies and admin guards
src/security.js           CSP/Helmet, origin checks, rate limiters
src/validation.js         Zod schemas and field errors
src/upload.js             Cover upload and safe deletion
src/repositories/         Admin, session, inquiry, project and service data access
src/routes/public.js      Public read APIs and inquiry submission
src/routes/admin.js       Authenticated admin APIs
```

## Production notes

- Use HTTPS and set `NODE_ENV=production` so the session cookie is `Secure`.
- Set `APP_ORIGIN` to the exact public origin.
- SQLite and uploaded covers need a persistent disk. Managed static-only hosting is not enough; run this as a Node service.
- Back up the database and uploads together.
- Do not put `.env` or `data/` in a public directory.

## Deploy to Render

A Render Blueprint is included in [`render.yaml`](render.yaml). It defines a paid Node web service with a 1 GB persistent disk mounted at `/var/data`.

1. Push this repository to GitHub with the app at the repository root.
2. In Render, choose **New → Blueprint**, connect the repository and select the `main` branch.
3. Apply the Blueprint. When prompted, set:
   - `ADMIN_EMAIL` — the owner email for the first admin account.
   - `ADMIN_PASSWORD` — a strong unique password. This is used only to create the first admin; never commit it.
   - `APP_ORIGIN` — leave blank for the first deploy, then set it to the public URL Render gives you (for example `https://needyoursite.onrender.com`). If you use a custom domain, set it to `https://your-domain.com` after attaching the domain.
4. After the deploy is live, open `/admin/login`, sign in, and change the password from **Settings**. Then set `APP_ORIGIN` and redeploy so same-origin checks use the final public origin.

The service stores its database at `/var/data/needyoursite.db` and covers at `/var/data/uploads/projects`. Render's persistent disks require a paid service plan. Do not switch the service to an ephemeral/free filesystem, or the database and covers will be lost on restart or deploy.

For a custom domain, add it in Render under **Settings → Custom Domains**, configure the DNS record Render shows, set `APP_ORIGIN` to that HTTPS origin and redeploy. Render provisions TLS automatically.

To back up the live data, download or copy the entire disk contents (`/var/data`) so the database and uploads stay together.
