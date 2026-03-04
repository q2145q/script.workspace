# ARCHITECTURE — AI Screenwriting Workspace

## Tech Stack

| Слой | Технология |
|------|-----------|
| Monorepo | pnpm workspaces + Turborepo |
| Frontend | Next.js 15 (App Router) + React 19 |
| API | tRPC v11 (colocated в Next.js) |
| Auth | Better Auth (MIT, self-hosted) |
| Database | PostgreSQL (Neon) + Prisma 6 |
| Editor | TipTap 2 (ProseMirror) |
| Styling | Tailwind CSS v4 |
| Notifications | Sonner |
| Panels | react-resizable-panels |

---

## Monorepo Structure

```
script.workspace/
├── apps/
│   └── web/                    # Next.js frontend + API routes
│
├── packages/
│   ├── api/                    # tRPC routers + Better Auth + middleware
│   ├── db/                     # Prisma schema + client singleton
│   ├── editor/                 # TipTap editor (React component)
│   ├── types/                  # Shared Zod schemas + TypeScript types
│   ├── tsconfig/               # Shared TS configs
│   └── eslint-config/          # Shared ESLint configs
│
├── docker-compose.yml          # PostgreSQL (local dev)
├── turbo.json                  # Build pipeline
└── pnpm-workspace.yaml         # Workspace definition
```

---

## Data Flow

```
Browser → Next.js Middleware (auth check)
       → App Router Page (RSC)
       → tRPC Client (React Query)
       → /api/trpc/[trpc] (fetch handler)
       → packages/api routers
       → Prisma → PostgreSQL

Auth:
Browser → /api/auth/[...all]
       → Better Auth handler
       → Prisma → PostgreSQL
```

---

## Packages — зависимости

```
@script/web
  ├── @script/api       (tRPC client + auth client)
  ├── @script/editor    (TipTap component)
  ├── @script/types     (Zod schemas)
  └── @script/db        (Prisma types only)

@script/api
  ├── @script/db        (Prisma client)
  └── @script/types     (validation schemas)

@script/editor
  └── (standalone — no internal deps)

@script/types
  └── (standalone — only zod)
```

---

## Key Files Reference

### Config
| File | Purpose |
|------|---------|
| `turbo.json` | Build tasks (build, dev, lint, type-check) |
| `packages/tsconfig/base.json` | Base TS: strict, ES2022, bundler resolution |
| `packages/tsconfig/nextjs.json` | Next.js: jsx preserve, noEmit |
| `packages/tsconfig/react-library.json` | Libraries: jsx react-jsx |

### Database
| File | Purpose |
|------|---------|
| `packages/db/prisma/schema.prisma` | All models |
| `packages/db/src/index.ts` | Prisma client singleton (dev hot reload safe) |

### API
| File | Purpose |
|------|---------|
| `packages/api/src/trpc.ts` | tRPC init, context, publicProcedure, protectedProcedure |
| `packages/api/src/auth.ts` | Better Auth server config |
| `packages/api/src/auth-client.ts` | Client-side auth (signIn, signUp, signOut, useSession) |
| `packages/api/src/root.ts` | Root router (project + document + user) |
| `packages/api/src/routers/project.ts` | Project CRUD with ownership checks |
| `packages/api/src/routers/document.ts` | Document get + save with role checks |

### Editor
| File | Purpose |
|------|---------|
| `packages/editor/src/components/Editor.tsx` | Main TipTap component |
| `packages/editor/src/components/EditorToolbar.tsx` | Formatting toolbar |
| `packages/editor/src/hooks/useEditorAutosave.ts` | Debounced save (2s) |

### Web App
| File | Purpose |
|------|---------|
| `apps/web/middleware.ts` | Route protection (session cookie check) |
| `apps/web/lib/trpc/client.tsx` | TRPCProvider + useTRPC hook |
| `apps/web/lib/trpc/server.ts` | Server-side tRPC caller for RSC |
| `apps/web/app/layout.tsx` | Root layout (providers, Toaster) |

---

## Auth Architecture

```
Better Auth (server)
  ├── Prisma adapter → PostgreSQL
  ├── Email/password provider
  └── Session via cookie: "better-auth.session_token"

tRPC context:
  auth.api.getSession({ headers })
    → session + user injected into ctx
    → protectedProcedure checks ctx.user

Middleware (Next.js):
  Checks cookie existence → redirect to /sign-in if missing
  Public paths: /sign-in, /sign-up, /api/auth
```

---

## Database Schema (Current)

```
User ← Session (1:N)
User ← Account (1:N)
Verification (standalone)

User ← Project (owner, 1:N)
User ← ProjectMember (N:M via join table)
Project ← ProjectMember (1:N)
Project ← Document (1:N)
```

### Enums
- `ProjectRole`: OWNER, EDITOR, COMMENTER, VIEWER
- `ProjectType`: FEATURE_FILM, TV_SERIES, SHORT_FILM, OTHER

### Key Design Decisions
- `Document.content`: Json field storing TipTap JSONContent
- Auth tables use `@@map("user")` etc. (lowercase) — Better Auth requirement
- App tables use `@default(cuid())` for IDs, `@default(now())` for timestamps
- `Project.isPrivate` defaults to `true` — security by default

---

## Commands

```bash
pnpm dev               # Запустить все apps в dev-режиме
pnpm build             # Production build
pnpm lint              # ESLint
pnpm type-check        # TypeScript проверка

pnpm db:generate       # Prisma generate (после изменения schema)
pnpm db:push           # Push schema в БД (без миграции)
pnpm db:migrate        # Создать миграцию (production)
pnpm db:studio         # Prisma Studio GUI

pnpm clean             # Очистить build-артефакты
```

---

## Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host/db` |
| `BETTER_AUTH_SECRET` | JWT signing secret | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | App base URL | `http://localhost:3001` |
