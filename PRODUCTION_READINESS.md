# Production Readiness Audit

Audit date: 2026-09-26

This audit did not change application code. It inspected the repository, ran the typecheck, dependency audit, production build, and production server, and exercised authentication against the running app.

## Executive Summary

Current state: **BLOCKED**

Providing MongoDB, a domain, HTTPS, and environment variables is not enough to deploy this application correctly. The project builds and the production server starts, but two code defects will cause production failures:

1. Logout always redirects the browser to `localhost` on the Node port, including when the request comes in on another host. Behind a domain or reverse proxy, logout does not return the user to the real login page.
2. The MongoDB client caches a failed connection for the life of the process. One failed first connection leaves every later request failing until the process is restarted.

The rest of the application is a small Next.js App Router app with one shared password, one MongoDB collection, and optional MinIO. There is no Docker, reverse proxy, CI, test suite, webhook, cron, email, or payment integration in this repository. Those are not missing features that the code expects. They are simply absent.

Local `.env` currently has an empty `MONGODB_URI`, so this machine cannot prove live database reads and writes. The database failure path was observed: the server stays up, and project APIs return a generic 500.

---

## 1. Production Blockers

### 1.1 Logout redirects to localhost, not the public host

* Problem: `POST /api/auth/logout` builds an absolute redirect from `request.url`. On the production server that URL is always `localhost` plus the Node port. The `Host` header and `X-Forwarded-Host` do not change it. `X-Forwarded-Proto: https` only changes the scheme, so the target becomes `https://localhost:<port>/login`.
* Evidence: `src/app/api/auth/logout/route.ts` uses `NextResponse.redirect(new URL("/login", request.url), 303)`. Verified on `next start` (Next.js 15.5.24, port 3456):
  * `POST http://127.0.0.1:3456/api/auth/logout` → `location: http://localhost:3456/login`
  * same request with `Host: hub.example.com` → `location: http://localhost:3456/login`
  * same request with `Host: hub.example.com` and `X-Forwarded-Proto: https` → `location: https://localhost:3456/login`
  * The session cookie is cleared on that response (`Max-Age=0`). The browser is then sent to a host it cannot use.
* Impact: On any deployment that is not opened as `http://localhost:<node-port>` on the server itself, logout ends on a dead URL. Login is unaffected because it returns JSON and the browser navigates with a relative path. Middleware and the home page already redirect with a relative `location: /login`, which does follow the public host.
* Required action: Make the logout redirect relative, the same way the middleware redirect already is. This is a code change. Proxy configuration cannot fix it, because the app ignores the public host.

### 1.2 A failed MongoDB connection is cached until restart

* Problem: `getDb()` stores `client.connect()` on `globalThis` and never clears it. If that promise rejects, every later call awaits the same rejection.
* Evidence: `src/lib/db.ts`. The client is created once:

```ts
if (!global._projectHubMongo) {
  const client = new MongoClient(uri);
  global._projectHubMongo = client.connect();
}
const client = await global._projectHubMongo;
```

  There is no `.catch()` that resets `_projectHubMongo`. This was identified by reading the connection code. A failed connection was not induced against a live database, because `MONGODB_URI` is empty in the local environment.
* Impact: If MongoDB is down, slow, or unreachable on the first request after start (common when the database becomes ready after the app), the app keeps failing until the Node process is restarted. A later recovery of MongoDB does not recover the app.
* Required action: Clear the cached promise when `connect()` fails so the next request can try again. This is a code change. A correct connection string does not remove it.

---

## 2. Required Production Configuration

These are required even after the blockers above are fixed.

* Node.js 20 or newer (`package.json` `engines.node` is `>=20`). Verified on Node v24.18.0.
* Package manager: npm, using `package-lock.json`. The README documents npm. `pnpm-lock.yaml` is also committed; do not mix installers.
* A long-running Node process. The app is not written for Edge or for a read-only serverless filesystem.
  * Build: `npm run build` (`next build`)
  * Start: `npm run start` (`next start`)
  * `next start` listens on `0.0.0.0` by default and port `3000` unless `PORT` or `-p` is set. `HOSTNAME=0.0.0.0` is not required.
* MongoDB, reachable from that process. Standalone MongoDB is enough. No replica set is required, because the app does not use transactions.
* `MONGODB_URI` must include the database name, for example `mongodb://user:pass@host:27017/project-hub`. The code calls `client.db()` with no name. The driver then uses the database in the URI, and if the URI has none it uses `test` (`mongodb` driver `connection_string.js`).
* `PROJECT_HUB_PASSWORD`: any non-empty string. Production refuses to start a password check if it is missing (`src/lib/auth.ts`). The value in `.env.example` is `1111`. That value works in production if you set it. Do not use it. There is no rate limit or lockout.
* `SESSION_SECRET`: a long random string. Optional in code. Set it. If it is omitted, the signing key is derived from the password.
* HTTPS in front of the app. In production the session cookie is `Secure`. A browser on plain HTTP will drop it, so login returns success and the user stays logged out. The app does not redirect HTTP to HTTPS itself.
* Reverse proxy, if the site is not exposed directly on port 3000:
  * Terminate TLS.
  * Proxy to the Node port.
  * Allow request bodies of at least `MAX_UPLOAD_MB` (default 5 MB) plus multipart overhead. Nginx’s default `client_max_body_size` of 1 MB will reject normal cover uploads.
  * No WebSocket endpoint is required for `next start`. This app has no custom realtime channel.
  * Forwarding `X-Forwarded-Proto` does not fix logout. See blocker 1.1.
* Cover images, pick one:
  * Local disk: the default directory is `<process cwd>/.data/uploads`, or `LOCAL_UPLOAD_DIR`. That directory must survive process restarts and deploys. There is no Docker volume in this repo because there is no Dockerfile. On a single VM with a real disk, the default directory is enough. On ephemeral disk or more than one app instance, local uploads will disappear or be visible on only one instance.
  * MinIO or S3-compatible storage: set all five `MINIO_*` variables. If any one is missing, the app silently keeps using local disk.
* Do not run `npm run dev:demo` or `npm run seed:force` in production. `dev:demo` starts an in-memory database and the dev server. `seed:force` deletes every document in `projects`.
* `npm run seed` is optional demo data, not required for an empty production database.
* Operational backups of the MongoDB database. The app has no backup job.

Not required by this codebase: Redis, email, SMS, payments, OAuth, webhooks, cron, a separate worker process, Docker, a specific domain name, or a CDN.

---

## 3. Environment Variables

No `NEXT_PUBLIC_*` variable exists. Nothing from this table is inlined into the browser bundle. The production build completed with `MONGODB_URI` empty, so none of these are required at build time. They are read at runtime on the server.

`NODE_ENV` is set by Next.js (`production` under `next start`). The app reads it. `PORT` is read by the Next.js CLI, not by application source.

| Variable | Required | Public/Secret | Used For | Example/Format | Production Required |
| -------- | -------- | ------------- | -------- | -------------- | ------------------- |
| `PROJECT_HUB_PASSWORD` | Yes | Secret | The one shared login password. Never stored in MongoDB. | A long random string. `.env.example` uses `1111`, which is a development example. | Yes, at runtime. Missing in production throws when a password is checked. In development only, the code falls back to `1111`. |
| `MONGODB_URI` | Yes | Secret | MongoDB connection. Database name is the path in this URI. | `mongodb://user:pass@host:27017/project-hub` or `mongodb+srv://user:pass@cluster.example.net/project-hub` | Yes, at runtime. Empty string is treated as missing. Not required to build or to boot `next start`. |
| `SESSION_SECRET` | Recommended | Secret | HMAC-SHA256 key for the session cookie. | Long random hex or base64 string. | Not required to boot. Strongly recommended. If unset, the key is `HMAC-SHA256("project-hub-session", PROJECT_HUB_PASSWORD)`. |
| `MAX_UPLOAD_MB` | No | Config | Server-side upload size cap in megabytes. | Positive number. Default `5` when unset. | No. An empty value becomes `0` and rejects every upload. A non-numeric value becomes `NaN` and the size comparison does not reject the file. |
| `LOCAL_UPLOAD_DIR` | No, unless you need a path other than the default | Config, can reveal filesystem layout | Directory for local cover files when MinIO is not fully configured. | Absolute path, for example `/var/lib/project-hub/uploads` | Only if local storage is used and the default `./.data/uploads` is not acceptable. |
| `MINIO_ENDPOINT` | Only for object storage | Config | S3/MinIO API endpoint. Parsed with `new URL()`. | `https://minio.example.com` or `http://10.0.0.5:9000`. A host without a scheme throws. | Required only when object storage is used. All five `MINIO_*` values must be non-empty together. |
| `MINIO_ACCESS_KEY` | Only for object storage | Secret | MinIO/S3 access key. Stays on the server. | Access key string | Same as above. |
| `MINIO_SECRET_KEY` | Only for object storage | Secret | MinIO/S3 secret key. Stays on the server. | Secret key string | Same as above. |
| `MINIO_BUCKET` | Only for object storage | Config | Bucket name passed to `putObject`. The bucket is not created by the app. | `project-hub` | Same as above. Create the bucket before the first upload. |
| `MINIO_PUBLIC_URL` | Only for object storage | Config (this URL is stored in MongoDB and sent to the browser) | Public base URL. The app stores `{MINIO_PUBLIC_URL}/covers/{uuid}.{ext}`. The bucket name is not inserted. | `https://cdn.example.com/project-hub` if that base already maps to the bucket | Same as above. Objects must be readable at that URL without the app’s session cookie. |
| `NODE_ENV` | Set by Next.js | Config | `production` turns on the `Secure` cookie and disables the `1111` password fallback. | `production` | Set automatically by `next start`. Do not run `next dev` as the production process. |
| `PORT` | No | Config | Port for `next start` / `next dev`. CLI default `3000`. | `3000` | No. |

`.env.example` matches the variables the application reads. It does not document `NODE_ENV` or `PORT`, which is normal. No documented variable is unused. No application variable is missing from `.env.example`.

The client-side upload hint does not read `MAX_UPLOAD_MB`. `src/lib/constants.ts` hardcodes `5`, and the form uses that constant. Changing the env var changes only the server limit unless the client constant is also changed.

---

## 4. Database Requirements

* Engine: MongoDB, official Node.js driver `mongodb@6.21.0`. Not Mongoose, not Prisma.
* Connection: one `MongoClient` per process, cached on `globalThis` (`src/lib/db.ts`). This is the right shape for Next.js, except for blocker 1.2. The app does not open a new client on every request when the first connection succeeds. Pooling is the driver default (`maxPoolSize` 100).
* Database name: whatever is in `MONGODB_URI`. There is no `MONGODB_DB` variable. If the URI has no database path, the driver selects `test`.
* Collection: `projects`. It is created implicitly on the first insert. No initialization script is required. An empty database is valid; the dashboard is built for an empty list.
* Document fields written by the app: `title`, `description`, `coverImage`, `projectUrl`, `githubUrl`, `adminPanelUrl`, `status`, `projectType`, `tags`, `favorite`, `notes`, `aiDocumentation`, `createdAt`, `updatedAt`. `_id` is a MongoDB `ObjectId`.
* Indexes: the application never calls `createIndex`. MongoDB’s default `_id` index is the only index. No unique constraint is defined. No manual index is required for the app to function at the size described in the README (an internal tool for two people).
* Optional index, not required to go live: `{ updatedAt: -1 }` if the collection later grows, because the list query is `find({}).sort({ updatedAt: -1 })`.
* Schema validation: Zod in the API, not MongoDB JSON Schema. The seed script inserts documents directly and does not go through Zod.
* Migrations: none.
* Seed: `npm run seed` inserts demo projects only when `projects` is empty. `npm run seed:force` deletes the collection contents and inserts demo projects. Production does not need either command. Seed cover images point at `https://picsum.photos/...`, which the browser loads. The app itself does not call that host.
* Transactions: none. A replica set is not required.
* Startup: `next start` does not connect to MongoDB during boot. The first page or API call that needs data connects. There is no health endpoint.

---

## 5. External Services

| Service | Purpose | Required environment variables | Required credentials | DNS / domain | Webhook | Production status | Blocker |
| ------- | ------- | ------------------------------ | -------------------- | ------------ | ------- | ----------------- | ------- |
| MongoDB | All project data | `MONGODB_URI` | User/password or equivalent inside the URI, plus network access from the app | None in the app | No | Required. Not connected in this environment (`MONGODB_URI` empty). | Connection-caching bug (section 1.2). The service itself is configuration. |
| MinIO or S3-compatible storage | Cover images, optional | `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`, `MINIO_PUBLIC_URL` | Access key and secret key | Public URL that serves `covers/<file>` | No | Optional. Unused unless all five variables are set. Bucket must already exist. Region is not configurable. This client is aimed at MinIO; AWS S3 may need options this code does not set. | No, if local disk is used instead. |
| HTTPS terminator / reverse proxy | `Secure` cookies and public hostname | None in the app | TLS certificate | The public hostname | No | Not in the repo. Required for a normal deployment. | Logout host bug (section 1.1) is in the app, not the proxy. |
| picsum.photos | Demo cover images in `scripts/seed.mjs` only | None | None | None | No | Not used unless the database is seeded | No |

Not present: Redis, email, SMS, payments, OAuth, analytics, maps, webhooks, cron, background workers.

---

## 6. Deployment Requirements

```text
Node.js >= 20
npm
MongoDB (external; database name inside MONGODB_URI)
Environment variables (section 3)
HTTPS
Reverse proxy if Node is not exposed directly
Persistent disk for .data/uploads, or MinIO
Single long-running Node process (next start)
```

There is no Dockerfile, docker-compose file, Nginx config, Traefik config, or GitHub Actions workflow in this repository.

`next start` details that were checked:

* Command is `next start`.
* Default bind is `0.0.0.0` (CLI help, and the production process printed a network URL).
* Default port is `3000` (`PORT` or `-p` overrides it).
* Runtime env is read when requests run, not baked in at build time.
* Uploaded files are not in the image or the build output. They live on local disk or in MinIO.
* MongoDB is always external. Nothing in the repo starts a database, except `npm run dev:demo`, which is a development-only in-memory server.

A container would be suitable only if you add, outside this repo, a persistent volume for local uploads or you set MinIO, and you pass the runtime env vars. This repository does not define that container. More than one instance requires MinIO (or another shared store). Local files are not shared.

There is no healthcheck route. A proxy can use `GET /login`, which returns 200 without MongoDB.

---

## 7. Build Verification

Verified on Node v24.18.0 and npm 11.16.0. The production build and `next start` were run from an isolated copy so the already-running `npm run dev` process would not share its `.next` directory.

| Step | Result | Evidence |
| ---- | ------ | -------- |
| install | PASS | `npm ls --depth=0` resolved every dependency in `package.json`. A clean `npm ci` was not repeated; `node_modules` was already in use by the dev server. |
| typecheck | PASS | `npx tsc --noEmit` exited 0. `next build` also reported type checking and finished. |
| lint | NOT CONFIGURED | No ESLint dependency, config, or `lint` script. |
| tests | NOT CONFIGURED | No test files and no test script. `mongodb-memory-server` is only used by `scripts/demo.mjs`. |
| production build | PASS | `next build` (Next.js 15.5.24) compiled, typechecked, and generated all routes. MongoDB was not required. App routes are dynamic server renders. Static outputs are `/_not-found` and `/icon.svg` only. |
| production start | PASS | `next start` reached Ready. `GET /login` returned 200. `GET /projects` without a cookie returned 307. `GET /api/projects` without a cookie returned 401. The process then logged `MONGODB_URI is not configured` when a projects page was rendered, and stayed up. |

Build warning, observed in the isolated build: Next.js reported that it inferred the workspace root from `C:\Users\sajad\package-lock.json` (a lockfile outside this repo) and also saw this repo’s `pnpm-lock.yaml`. `output: "standalone"` is not enabled, and `next start` still served the app. On a machine whose parent directories have no lockfile, the in-repo pair of `package-lock.json` and `pnpm-lock.yaml` can still trigger this warning. It did not stop the build that was run.

Not verified against a real database or object store:

* Creating, updating, deleting, and listing projects once `MONGODB_URI` points at a live server.
* A successful cover upload to local disk or MinIO.
* That a browser on HTTP actually discards the `Secure` cookie. The production response did include `Secure`. That is standard browser behavior, not something this audit loaded in a browser.
* End-to-end HTTPS behind a proxy. Header behavior was tested with curl against `next start`.

---

## 8. Security Findings

### Critical

None that are present regardless of configuration. Deploying the example password `1111` on a reachable network would be a critical misconfiguration. The code allows it. See High.

### High

* No real brute-force protection. `POST /api/auth/login` waits 300 ms on a failed attempt (`src/app/api/auth/login/route.ts`). That delay is per request. Parallel requests are not queued, and there is no lockout, per-IP limit, or minimum password length. The only gate for every project, note, admin URL, and AI document is this one password. A short password is guessable. Required action before a network-reachable deploy: set a long random `PROJECT_HUB_PASSWORD`. A code change would be required to add a limit; that was not done in this audit.
* Logout redirect host confusion. See blocker 1.1. The cookie is cleared, then the browser is sent to `localhost`. On a public host this is a broken security control as well as a broken redirect: the user does not land on the real login page.

### Medium

* Sessions last 30 days (`SESSION_TTL_SECONDS` in `src/lib/auth.ts`) and there is no server-side session store. A stolen cookie works until expiry. `HttpOnly`, `SameSite=Lax`, and `Secure` (production) are set. There is no refresh token.
* If `SESSION_SECRET` is set, changing `PROJECT_HUB_PASSWORD` does not invalidate existing cookies. Rotation requires changing `SESSION_SECRET` (or waiting 30 days). If `SESSION_SECRET` is unset, the key is derived from the password, so a password change does invalidate sessions.
* Middleware on `/projects/:path*` checks cookie shape and expiry only. It does not check the HMAC (`src/middleware.ts`). Pages call `requirePageAuth()` and APIs call `requireApiAuth()`, which do check the HMAC. A forged cookie can get past the middleware and still be rejected by the page or API. `generateMetadata` in `src/app/projects/[id]/page.tsx` loads the project before the page auth check. This audit did not confirm that the title is returned to the client on that path.
* No security headers are configured in `next.config.ts`. Responses do not set Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, or Strict-Transport-Security. The dev server sent `X-Powered-By: Next.js`, and the config does not disable `poweredByHeader`. The login form can be framed. HSTS belongs on the HTTPS proxy; the app will not set it.
* Upload validation trusts the browser’s MIME type or the filename extension (`src/lib/storage.ts`). It does not check file bytes. Only an authenticated caller can upload. The file is stored with a server-generated UUID name and, for local files, served as `image/jpeg`, `image/png`, or `image/webp`. SVG is not allowed. The size check runs after `request.formData()` has already buffered the body, and the route sets no body limit of its own.
* Local upload names are constrained on read (`src/app/api/uploads/[name]/route.ts` allows only `uuid.ext` style names). That part is sound. Deleting or replacing a project does not delete the stored file, so disk or bucket use grows.
* Dependency advisories from `npm audit --omit=dev` (not fixed, per this audit):
  * High: `postcss` via `next@15.5.24` (CSS stringify / source-map advisories). This runs in the Next build toolchain, not on user HTML. The audit’s suggested fix upgrades Next to 16, which is a breaking change.
  * High: `sharp` (libheif). Next ships it for image optimization. This app renders covers with a plain `<img>`, not `next/image`. `npm audit fix` (without `--force`) reports that `sharp` can be updated.
  * Moderate: `minio` via `query-string` / `decode-uri-component` and `stream-json`. These are on the MinIO client path. The endpoint comes from env, not from the end user.

### Low

* Password comparison returns early when lengths differ, so it is not fully timing-safe (`verifyPassword` in `src/lib/auth.ts`).
* `GET /api/uploads/[name]` does not send `X-Content-Type-Options: nosniff`. Content-Type is an image type.
* The projects page tells a signed-in user to check MongoDB when the database call fails. API routes return generic JSON (`Could not load projects.`) and log the stack on the server only. That API behavior was verified: with a valid development session and an empty `MONGODB_URI`, `GET /api/projects` returned `500` and `{"error":"Could not load projects."}`.
* No `robots` metadata. If the login page is on the public internet, it can be indexed. There is no sitemap, canonical, or Open Graph tag. `src/app/icon.svg` exists and the build emits `/icon.svg`.
* Favorite toggle reads the document and then writes the opposite value. Two overlapping clicks can lose an update. This matches the two-person use described in the README.

### Informational

* Authorization is one shared password. There are no users, roles, or per-project owners. Any valid session can read, create, update, delete, favorite, and upload. That is what the code implements. Server routes enforce the session. This is not a client-only check. It is not multi-tenant IDOR, because there is only one tenant.
* CSRF: state-changing routes are POST, and the cookie is `SameSite=Lax`. A cross-site POST does not include that cookie. There is no CSRF token. That is consistent with this cookie design.
* User content is rendered as React text, including AI documentation. The only `dangerouslySetInnerHTML` is a fixed theme script in `src/app/layout.tsx`. Cover and link fields must be `http:`/`https:` or, for images, a single relative path. The server does not fetch those URLs, so this is not server-side SSRF.
* Production browser source maps are not enabled.
* `npm run dev` falls back to password `1111` when `PROJECT_HUB_PASSWORD` is unset. `next start` does not.
* `mongodb-memory-server` is a devDependency listed in `serverExternalPackages`. Application code does not import it. Production `npm ci --omit=dev` should still run. `dev:demo` must not be the production command.

---

## 9. Production Risks

* Full collection load. `listProjects()` returns every project, including `notes` and `aiDocumentation` (up to 100,000 characters each), with no pagination. Search and sort then run in the browser. Fine for a small internal list. It will get heavy if the collection or the documents grow.
* No secondary indexes. See section 4.
* Partial MinIO configuration silently uses local disk. A production host that loses `.data/uploads` then loses covers, while MongoDB still has `/api/uploads/...` URLs.
* MinIO objects are public at `MINIO_PUBLIC_URL`. Local uploads stay behind the session. Switching to MinIO changes cover images from private to world-readable.
* The MinIO client is constructed per upload and does not create the bucket. A missing bucket becomes a generic 500 on `POST /api/upload`.
* `MINIO_PUBLIC_URL` is prefixed as-is. If the public URL style needs the bucket in the path, that base URL must already include it.
* Client and server upload limits can disagree. See section 3.
* Database name omission writes to `test` with no warning.
* No process-level readiness check. Orchestration that only checks that the port is open will mark the app healthy while MongoDB is down.
* Both lockfiles are committed (`package-lock.json` and `pnpm-lock.yaml`). Next.js warned about workspace root detection during this build. Use npm, as the README says.
* `seed:force` is a data wipe.
* No automated tests cover login, CRUD, uploads, or the production cookie flags.
* No CI config, so nothing rechecks the build on a clean machine except what was run for this audit.

---

## 10. Things That Are Already Production-Ready

These were checked, not assumed.

* Production build completes without MongoDB, MinIO, or a real password. All product routes are server-rendered on demand, so private data is not statically generated at build time.
* `next start` boots, binds beyond localhost, and serves `/login` without a database.
* App Router on Next.js 15.5.24 and React 19.2.8. Route handlers and server components use the Node.js runtime. Middleware does not import Node-only modules. There are no server actions.
* Session cookie on the production server: `HttpOnly`, `SameSite=Lax`, `Secure`, `Path=/`, `Max-Age=2592000` (30 days). Development correctly omitted `Secure`. The cookie value is an HMAC over `v1.<expiry>`, not the password.
* Unauthenticated `GET /projects` redirects to login. Unauthenticated `GET /api/projects` and `POST /api/upload` return `401` and `{"error":"Unauthorized."}`. A wrong password returns `401` and `{"error":"Incorrect password."}`. A correct password returns `200` and `{"ok":true}` plus the cookie. These were executed against the running dev server, and the production cookie flags were executed against `next start`.
* Every project API checks `requireApiAuth()` before MongoDB. Page routes under `/projects` call `requirePageAuth()`. Unexpected API errors return generic messages.
* Project writes go through Zod (`src/lib/validation.ts`): length limits, status and type enums, `http`/`https` URLs, tag limits.
* Local upload reads reject path traversal by allowing only a generated filename pattern.
* MongoDB access uses the driver with `ObjectId`, not string-built queries.
* No hardcoded production credentials, no auth bypass flag, and no mock API responses in `src/`. Demo data exists only in `scripts/seed.mjs` and `scripts/demo.mjs`.
* Fonts come from the `geist` package. The app does not call a font CDN at runtime.
* Covers use `<img>`, so arbitrary cover URLs do not depend on `images.remotePatterns`.
* TypeScript `strict` is on, and `tsc --noEmit` passed.
* `.env` is gitignored. `.env.example` lists the real variable names.

---

## 11. Final Deployment Checklist

* [ ] Fix logout so the redirect is relative (or otherwise uses the public host). Verified broken on `next start`.
* [ ] Fix MongoDB connection caching so a failed `connect()` is not reused forever.
* [ ] MongoDB is reachable from the app
* [ ] `MONGODB_URI` includes the database name (the app will not ask for a separate name)
* [ ] `PROJECT_HUB_PASSWORD` is a long random value, not `1111`
* [ ] `SESSION_SECRET` is a long random value
* [ ] `NODE_ENV=production` via `next start`, not `next dev`
* [ ] HTTPS is terminated in front of the app (`Secure` cookie)
* [ ] Reverse proxy body limit is at least the upload cap (default 5 MB)
* [ ] Cover storage chosen: persistent `LOCAL_UPLOAD_DIR` (default `.data/uploads`) or all five `MINIO_*` variables, with the bucket already created and publicly readable at `MINIO_PUBLIC_URL`
* [ ] `npm run build` passes on the deployment host
* [ ] `npm run start` is the process that stays up
* [ ] Login, project create/read/update/delete, and a cover upload are tried against the real MongoDB
* [ ] Logout returns to the public `/login`, not `localhost`
* [ ] MongoDB backups are configured outside the app
* [ ] `npm run seed:force` and `npm run dev:demo` are not used in production

Not applicable to this repository: webhook URLs, cron processes, Redis, OAuth apps, email DNS, payment keys, and a required manual index or migration.
