# DocShare Mini

A minimalist full‑stack document sharing app built as a small production‑grade monorepo.

- **Backend:** NestJS (TypeScript), MongoDB (Mongoose), JWT auth, Multer for uploads, Local disk storage, Swagger.
- **Frontend:** Vue 3 + Vite + Vue Router (lazy‑loaded routes), Tailwind CSS, TanStack Query (Vue Query), Axios.
- **Monorepo:** Nx + PNPM workspaces.

The goal is to demonstrate clean code, thoughtful design, and handling of real‑world edge cases in a compact codebase.

---

## Table of contents

1. [Architecture overview](#architecture-overview)
2. [Pre‑requisites](#pre-requisites)
3. [Install & bootstrap](#install--bootstrap)
4. [Environment variables](#environment-variables)
5. [Run (development)](#run-development)
6. [Run (production-ish)](#run-production-ish)
7. [Project scripts](#project-scripts)
8. [API summary](#api-summary)
9. [UI walkthrough](#ui-walkthrough)
10. [Possible improvements](#possible-improvements)

---

## Architecture overview

```
packages/
├─ api/                      # NestJS server (v11)
│  ├─ src/
│  │  ├─ app.module.ts      # root module with Mongoose + config
│  │  ├─ core/              # guards, interceptors, storage port, utils
│  │  ├─ infra/             # LocalDisk storage (implements StoragePort)
│  │  ├─ modules/
│  │  │  ├─ auth/           # register/login/me (JWT)
│  │  │  ├─ documents/      # upload, list mine, list shared, download
│  │  │  ├─ shares/         # share document to a user by email
│  │  │  └─ models/         # Mongoose schemas: User, Document, Share, Audit
│  │  └─ main.ts            # swagger, CORS, security headers
│  └─ .env                  # server env (see below)
│
└─ web/                      # Vue 3 app (Vite)
   ├─ src/
   │  ├─ api/               # axios clients for /auth, /documents, /shares
   │  ├─ components/
   │  │  ├─ docs/           # DocList (table), row actions, etc.
   │  │  ├─ share/          # UploadShareCard (share UX)
   │  │  └─ upload/         # Upload cards
   │  ├─ lib/               # http client, query client, token utils, mime
   │  ├─ pages/
   │  │  ├─ auth/           # LoginPage, RegisterPage
   │  │  └─ dashboard/      # MyDocsPage, SharedWithMePage, layout
   │  └─ router/            # lazy‑loaded routes + navigation guards
   └─ tailwind + Vite config
```

### Key backend concepts

- **Mongoose schemas**: `User`, `Document`, `Share`, `Audit`.
- **Auth**: email/password with bcrypt; JWT access token; `JwtAuthGuard` protects private routes.
- **Storage port**: `StoragePort` defines `save`, `read`. We ship a `LocalDiskStorage` adapter, making it trivial to swap for S3/GCS later.
- **Audit** (optional in spec but implemented): view/download events stored per doc, owner‑only listing with cursor pagination.
- **Swagger**: auto‑generated at `/v1/docs` and enabled in dev.

### Key frontend concepts

- **Vue Router (lazy)**: dashboard pages are code‑split and loaded on demand.
- **TanStack Query**: all server state (lists, mutations) uses query keys, optimistic refetch after mutations (e.g., upload → refresh list).
- **Token management**: token lives in `localStorage`, Axios interceptor attaches `Authorization: Bearer <token>`; guard redirects to `/login` if missing/invalid.
- **Upload UX**: drag‑and‑drop + button, progress feedback; separate cards for
  - **Upload only** (My documents page)
  - **Upload & share** (Shared page – optional immediate share by entering emails)
- **Shared page**: first section lists **your documents** (you can share them), second lists **documents shared with you** (view/download only).

---

## Pre‑requisites

- **Node.js 20+**
- **PNPM 9+**
- **MongoDB** running locally (or a connection string to a remote instance)

---

## Install & bootstrap

```bash
pnpm install
```

**Important (PNPM workspaces):** ensure the repo has a `pnpm-workspace.yaml` with:

```yaml
packages:
  - 'packages/*'
  - 'packages/**'
```

Remove `"workspaces"` from `package.json` if present to silence warnings.

---

## Environment variables

Create `packages/api/.env`:

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/docshare-mini
JWT_SECRET=supersecret_superlong_value
BCRYPT_ROUNDS=10
UPLOAD_DIR=.uploads
```

`UPLOAD_DIR` is where local files are stored during development.

---

## Run (development)

Start both API and Web with a single command (Nx runs them in parallel):

```bash
pnpm dev
```

- API: http://localhost:3000
- Swagger: http://localhost:3000/v1/docs
- Web: http://localhost:4200

If you want to run only one app:

```bash
pnpm dev:api   # Nest server only
pnpm dev:web   # Vite web only
```

For web with a custom API URL:

```bash
pnpm dev:web:local   # uses VITE_API_URL=http://localhost:3000
```

---

## Run (production‑ish)

Build both projects and run API + a Vite preview server:

```bash
pnpm build
pnpm start:prod
```

> `start:prod` uses `concurrently` to run API (from `dist`) and web preview. Alternatively, deploy them separately.

---

## Project scripts

These are defined at the repo root (see `package.json`).

```jsonc
{
  "scripts": {
    "dev": "nx run-many -t serve --projects=api,web --parallel",
    "dev:api": "nx serve api",
    "dev:web": "nx serve web",

    "dev:web:local": "cross-env VITE_API_URL=http://localhost:3000 nx serve web",

    "build": "nx run-many -t build --projects=api,web --parallel",
    "build:api": "nx build api",
    "build:web": "nx build web",
    "build:shared": "nx build shared",

    "start:api": "node dist/packages/api/main.js",
    "preview:web": "nx preview web",
    "start:prod": "concurrently -k -n API,WEB \"pnpm start:api\" \"pnpm preview:web\"",

    "lint": "nx run-many -t lint --all",
    "test": "nx run-many -t test --all",
    "typecheck": "nx run-many -t typecheck --all || true",
    "format": "nx format:check",
    "format:write": "nx format:write",
    "graph": "nx graph",
    "deadcode": "ts-prune -p tsconfig.json | sort",
    "reset": "nx reset"
  }
}
```

> If you keep `start:prod` or `dev:web:local`, install the tiny utilities once:
>
> ```bash
> pnpm add -D concurrently cross-env
> ```

---

## API summary

**Auth**

- `POST /v1/api/auth/register` – `{name, email, password}` → creates a user
- `POST /v1/api/auth/login` – `{email, password}` → `{access_token}`
- `GET  /v1/api/auth/me` – current user (JWT required)

**Documents**

- `POST /v1/api/documents/upload` – multipart `file` (pdf/png/jpg) → document DTO
- `GET  /v1/api/documents/mine` – list of your documents
- `GET  /v1/api/documents/shared` – documents shared with you
- `GET  /v1/api/documents/:id/download` – download if you’re owner or shared

**Shares**

- `POST /v1/api/shares` – `{documentId, targetEmail}` → shares document as **VIEWER**

**Audit** (owner only)

- `GET  /v1/api/documents/:id/audit?limit=&cursor=` – view/download counts and paginated events

> All endpoints except `/auth/register` and `/auth/login` are protected by JWT.

---

## UI walkthrough

- **/login** / **/register** – create two users to test sharing.
- **/app/mine** – upload files, list your documents, download. After upload, the list is automatically refetched.
- **/app/shared** – two sections:
  1. **My documents (you can share these)**: pick a doc and share it with a registered email.
  2. **Documents shared with me**: items shared by others; you have viewer access only.
- **Guards** – if your token is missing/expired you are redirected to **/login**.

---

## Why this architecture?

- **Nx + PNPM** gives fast builds, caching, and explicit project graphs.
- **NestJS + Mongoose** is a well‑tested stack for APIs that need speed + structure.
- **Storage port** keeps file storage vendor‑agnostic – easy to switch to S3 later.
- **Vue 3 + Vite** gives instant feedback and a tiny production bundle.
- **TanStack Query** centralizes server state, refetching, and caching logic.
- **Lazy routes** keep initial JS payload small (fast first paint).
- **Clear separation of concerns**: API contracts in `/api`, thin clients in `/web/src/api`, UI split into feature folders.

---

## Possible improvements

- Replace LocalDisk storage with S3/GCS and signed URLs
- Email notifications when a document is shared
- Advanced RBAC (Owner, Editor, Viewer), revoke access
- Virus scanning and file type sniffing
- E2E tests with Playwright (currently not enabled)
- Docker compose for API + MongoDB + web
- i18n and accessibility audit

---

## Troubleshooting

- **Nx daemon/cache issues**:
  ```bash
  pnpm reset
  ```
- **PNPM warns about `workspaces`**: ensure `pnpm-workspace.yaml` exists and remove `"workspaces"` from `package.json`.
- **404 for downloads**: check `UPLOAD_DIR` and that the file exists on disk; verify you are the owner or have a share link in DB.
- **CORS**: app enables CORS for development; check `VITE_API_URL` if the web points to a non‑default server.

---

## Git hooks (Husky)

Keep the main branch clean by running basic checks before each commit.

### Install Husky (one-time)

```bash
pnpm dlx husky-init && pnpm install
```

This creates `.husky/` and adds a `prepare` script so hooks are installed on fresh clones.

### Pre-commit hook

We provide a pre-commit hook that runs:

- `pnpm format:write` – format staged files
- `pnpm lint` – lint entire workspace
- `pnpm typecheck` – TypeScript type checks across projects

If you used `husky-init`, replace the generated hook with our version:

```
.husky/pre-commit
```

```sh
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🧹  Formatting staged files..."
pnpm format:write

echo "🔎  Linting workspace..."
pnpm lint

echo "🧪  Type-checking..."
pnpm typecheck

echo "✅  Pre-commit checks passed"
```

> Tip: For faster commits you can switch to `lint-staged` to only run linters on staged files.

---

## CI (GitHub Actions)

We include a simple workflow in `.github/workflows/ci.yml`:

- **On pull requests** → run **Lint**, **Typecheck**, and **Test** jobs.
- **On pushes to `main`** → run the same checks and then **Build** both apps.

The workflow uses **Node.js 20** and **PNPM 9**, with caching enabled.

```yaml
name: ci

on:
  pull_request:
    branches: ['**']
  push:
    branches: ['main']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test

  build:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
```

> You can later expand this to upload build artifacts, run E2E tests, or deploy.
