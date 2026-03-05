# Claude Code Instructions — Script Workspace

## Project Overview

Professional screenplay editor. Monorepo: pnpm + Turborepo.
- `apps/web` — Next.js 15 (App Router), React 19
- `apps/admin` — Admin panel (Next.js)
- `packages/ai` — Multi-provider AI (OpenAI, Anthropic, DeepSeek, Gemini, Yandex, Grok)
- `packages/api` — tRPC v11 routers + Better Auth
- `packages/db` — Prisma 6 + PostgreSQL
- `packages/types` — Shared Zod schemas

## CRITICAL: Production Environment

**This project is LIVE in production!**
- Domain: `script.yomimovie.art`
- Deployed via PM2 (`ecosystem.config.cjs`)
- Web: port 3002 (prod), Admin: port 3003 (prod)
- Dev: port 3001 (`pnpm dev`)

### Deployment Pipeline — MANDATORY for every change:

```
1. Code changes
     ↓
2. Tests (unit + integration)
     ↓
3. Type-check (pnpm type-check)
     ↓
4. Build locally (pnpm build)
     ↓
5. Run dev server, verify manually (pnpm dev)
     ↓
6. Only then: commit → push → rebuild prod
```

**NEVER push directly to production without completing steps 1-5.**

### Step-by-step verification commands:

```bash
# Step 2: Run tests
pnpm test:ai                    # unit tests (fast, no API keys)
pnpm test:ai:integration        # integration tests (real API calls)

# Step 3: Type-check entire project
pnpm type-check

# Step 4: Build all apps
pnpm build

# Step 5: Start dev server and verify in browser
# → See "Starting dev server" section below

# Step 6 (only after user confirms): Rebuild production
pnpm build && pm2 restart script-workspace && pm2 restart script-admin
```

### Starting dev server

**IMPORTANT:** Production runs via PM2 on ports 3002 (web) and 3003 (admin).
`pnpm dev` tries to start both web (3001) and admin (3003), but port 3003 is occupied by PM2 admin — so `pnpm dev` will partially fail.

**Correct way to start dev server (web only):**

```bash
cd apps/web && npx next dev --turbopack --hostname 0.0.0.0 --port 3001
```

This starts only the web app on port 3001 without conflicting with PM2.

**To stop:** `kill $(lsof -ti:3001)` or Ctrl+C if running in foreground.

**Do NOT** stop PM2 processes (`pm2 stop script-admin`) just to run `pnpm dev` — production must stay online.

### What to verify in dev before pushing:

| Change type | What to check in browser |
|-------------|--------------------------|
| Chat prompts | Open project → Chat panel → send message → verify response quality |
| Rewrite | Select text in editor → Rewrite → verify typed blocks apply with correct node types |
| Format | Select unformatted text → Format → verify screenplay blocks |
| New AI feature | Navigate to the new UI → test with real data |
| Provider changes | Switch model in settings → test chat with each changed provider |
| Schema changes | Run `pnpm db:generate` first, then build |

### Build/push safety rules:
- If `pnpm build` fails — fix before proceeding, do NOT push broken code
- If `pnpm type-check` has errors — fix them, do NOT ignore
- If dev server shows errors in console — investigate and fix
- Always ask user before running `pm2 restart` or any production command
- Never run `git push` without explicit user confirmation

---

## Mandatory Testing Rule

**After EVERY implementation step that touches AI/provider code, you MUST run the relevant tests.**

### Test commands:
```bash
# Unit tests (template engine, prompt loader, composition — no API keys needed)
pnpm test:ai

# Integration tests (real API calls to all 6 providers — requires API keys)
pnpm test:ai:integration

# Smoke test only (one quick request per provider)
pnpm test:ai:integration -- --grep "Smoke"

# Full project type-check
pnpm type-check
```

### When to run what:

| After changing... | Run |
|-------------------|-----|
| Template engine, prompt loader, compose | `pnpm test:ai` |
| System prompts (provider-specific) | `pnpm test:ai && pnpm test:ai:integration -- --grep "Smoke"` |
| Task prompts (.md files) | `pnpm test:ai:integration` for affected task type |
| Provider code (chat-stream, providers/*) | `pnpm test:ai:integration` for affected provider |
| New AI endpoint / feature | `pnpm test:ai:integration` for the new task × ALL 6 providers |
| Any change before committing | `pnpm test:ai && pnpm type-check` |

### Test requirements:
- **Every new AI feature must have integration tests for ALL 6 providers**
- If any provider fails, fix it before proceeding to the next step
- If a provider is temporarily unavailable (API down), note it and retry later — do NOT skip
- Integration tests validate response shape with Zod schemas

### API keys for tests:
Tests use env vars from `packages/ai/.env.test`:
```
OPENAI_API_KEY, ANTHROPIC_API_KEY, DEEPSEEK_API_KEY,
GEMINI_API_KEY, YANDEX_API_KEY, YANDEX_FOLDER_ID, GROK_API_KEY
```

---

## AI Implementation Plan

Full plan with all decisions: `AI Instruction/IMPLEMENTATION_PLAN.md`

Key architecture:
- System prompts: in code (5 TypeScript constants, one per provider)
- Task prompts: in .md files (`packages/ai/src/prompts/tasks/`)
- Prompt composition: `composePrompt(providerId, taskName, variables)`
- Two-layer: ProviderSystemPrompt → {{TASK_INSTRUCTIONS}} → TaskPrompt

---

## Code Style

- TypeScript strict mode
- ESM modules (`"type": "module"`)
- Zod for all schemas and validation
- tRPC for API layer

## Language

User communicates in Russian. Code, comments, commit messages, and AI prompts are in English.
