# Project Hub

A small, polished **internal Project Hub** — one clean place to store, browse, search, filter and open every project. Built for two people, not a thousand. Deliberately simple.

![stack](https://img.shields.io/badge/Next.js_15-TypeScript-blue) — MongoDB · Tailwind CSS v4 · Dark & light mode

## What it does

- **Password gate** — one shared password (`PROJECT_HUB_PASSWORD`), signed HTTP-only session cookie, no user accounts
- **Card dashboard** — cover image, status, type, tags, "updated X ago", favorite star, quick actions (open, GitHub, admin panel, edit, delete)
- **Instant search** — client-side across title, description, tags, type and status
- **Filters & sorting** — status pills, type/tag filters, favorites, 5 sort modes (default: Recently Updated)
- **Project detail page** — large cover, notes and an **AI Documentation** section with a one-click **Copy** button (Markdown preserved)
- **Add / Edit / Delete** — one compact shared form, delete confirmation, server-side validation
- **Cover images** — direct upload (JPG/PNG/WebP ≤ 5 MB) or paste a URL; nothing stored in MongoDB except a URL string

## Quick start

```bash
npm install
cp .env.example .env        # set PROJECT_HUB_PASSWORD and MONGODB_URI
npm run dev                 # http://localhost:3000
```

Log in with the password from your `.env` (default for local dev: `1111`).

**No MongoDB installed?** Run the zero-setup demo instead — it starts a throwaway
in-memory MongoDB, seeds it with example projects and runs the dev server:

```bash
npm run dev:demo
```

Production:

```bash
npm run build && npm start
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server (needs `MONGODB_URI`) |
| `npm run dev:demo` | Dev server + in-memory MongoDB + demo data |
| `npm run build` / `npm start` | Production build / serve |
| `npm run seed` | Insert demo projects (only when the DB is empty) |
| `npm run seed:force` | Wipe projects and re-seed demo data |

## Environment variables

See [.env.example](.env.example):

| Variable | Required | Description |
| --- | --- | --- |
| `PROJECT_HUB_PASSWORD` | yes | The single shared login password. Never stored in MongoDB. |
| `MONGODB_URI` | yes | MongoDB connection string (local or Atlas). |
| `SESSION_SECRET` | no | Secret for signing session cookies. Falls back to a value derived from the password. Set a long random string in production. |
| `MAX_UPLOAD_MB` | no | Max cover upload size in MB (default 5). |
| `LOCAL_UPLOAD_DIR` | no | Where local uploads go when MinIO is off (default `./.data/uploads`). |
| `MINIO_ENDPOINT` / `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` / `MINIO_BUCKET` / `MINIO_PUBLIC_URL` | no | When **all** set, uploads go to MinIO/S3-compatible storage instead of local disk. Credentials stay server-side. |

## Cover image storage

Two modes, same data model (`coverImage` is always just a URL string in MongoDB):

1. **Default (no config)** — uploads are saved to `.data/uploads` and served through the authenticated `/api/uploads/[name]` route.
2. **MinIO / S3-compatible** — fill in the `MINIO_*` variables and uploads are pushed to object storage with server-side credentials; MongoDB stores the public URL.

Switching from local to MinIO later requires **zero schema changes**.

## Project structure

```
src/
├── app/
│   ├── login/               # password screen
│   ├── projects/            # dashboard (card grid), new, [id] detail, [id]/edit
│   └── api/                 # auth, projects CRUD, favorite toggle, upload
├── components/
│   ├── ui/                  # Button, Field, Modal, ConfirmDialog, EmptyState, Skeleton, Toast
│   ├── projects/            # ProjectCard, ProjectGrid, ProjectBrowser, ProjectForm,
│   │                        # ProjectFilters, ProjectSearch, ProjectSort, StatusBadge,
│   │                        # TagList, CoverImage, FavoriteButton, CopyButton, …
│   ├── AppHeader.tsx        # logo · search · add · logout
│   └── icons.tsx            # dependency-free inline SVG icon set
└── lib/
    ├── auth.ts              # shared password + signed session cookie
    ├── db.ts                # MongoDB singleton
    ├── projects.ts          # data access (CRUD + favorite toggle)
    ├── validation.ts        # zod schemas (server-side validation)
    ├── storage.ts           # image upload → MinIO or local disk
    ├── constants.ts         # statuses, types, tag suggestions
    └── utils.ts             # cn(), date formatting
```

## API

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Verify password, set session cookie |
| `POST` | `/api/auth/logout` | Clear session, redirect to `/login` |
| `GET` / `POST` | `/api/projects` | List / create (validated, auth required) |
| `GET` / `PATCH` / `DELETE` | `/api/projects/[id]` | Read / update / delete |
| `POST` | `/api/projects/[id]/favorite` | Toggle favorite |
| `POST` | `/api/upload` | Cover image upload (multipart `file`) |

All project APIs return `401` without a valid session. Validation errors return
`400` with per-field messages; unexpected errors return generic messages (details
only in server logs).

## Security notes

- Password only ever lives in the environment; sessions are `HttpOnly` + `SameSite=Lax` (`Secure` in production), 30-day expiry, HMAC-signed
- No secrets in `localStorage`, no credentials sent to the browser
- All input validated server-side with zod; URLs must be `http(s)://`; uploads restricted to JPG/PNG/WebP with a size cap; upload filenames are strict-pattern-validated (no path traversal)

## Extending

- New status or project type → one line in `src/lib/constants.ts`
- New seed data → `scripts/seed.mjs`
- Swap local uploads for object storage → set the `MINIO_*` env vars, done
