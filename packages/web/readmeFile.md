packages/web/src
├─ api/ # All HTTP calls, one file per resource
│ ├─ documents.ts
│ ├─ shares.ts
│ └─ index.ts # Axios instance + helpers (base URL, interceptors)
│
├─ app/ # App shell helpers (currently minimal)
│
├─ components/ # Reusable UI components
│ ├─ docs/
│ │ └─ DocList.vue # Generic table to render a list of documents
│ ├─ share/
│ │ └─ UploadShareCard.vue # Share-by-email card (no file upload)
│ └─ upload/
│ ├─ UploadAndShareCard.vue # Upload + share (used when we want immediate share)
│ └─ UploadMyDocCard.vue # Upload into "my documents" only
│
├─ lib/ # Cross-cutting utilities
│ ├─ auth.ts # Token storage (get/set/clear), helper guards
│ ├─ http.ts # Axios client with interceptors
│ ├─ index.ts # Small helpers (date formatting, etc.)
│ ├─ lazy.ts # defineAsyncComponent wrapper for lazy imports
│ ├─ mime.ts # Allowed MIME types and file-extension helpers
│ ├─ queryClient.ts # TanStack Query client factory
│ └─ token.ts # Authorization header helpers
│
├─ pages/
│ ├─ auth/
│ │ ├─ LoginPage.vue
│ │ └─ RegisterPage.vue
│ └─ dashboard/
│ ├─ DashboardLayout.vue # Shell (sidebar, header, <router-view/>)
│ ├─ MyDocsPage.vue # Upload + list my docs (+ download)
│ └─ SharedWithMePage.vue # Two lists: (A) my docs to share, (B) docs shared with me
│
├─ router/
│ ├─ guards.ts # Global beforeEach (auth enforcement, redirect to /login)
│ └─ index.ts # Route table, **lazy-loaded** components
│
├─ types/
│ └─ dto.ts # TS interfaces for API payloads/DTOs
│
├─ main.ts # App bootstrap (Query client, router, Tailwind)
├─ styles.css # Minimal app styles
└─ vite/tailwind/postcss/tsconfig.\* # Tooling configs
