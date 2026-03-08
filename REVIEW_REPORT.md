# Code Review Report — Script Workspace

**Date:** 2026-03-07
**Scope:** Full codebase review — code quality, business logic, UX/UI, admin panel, landing page
**Project:** Professional screenplay editor (monorepo, production at script.yomimovie.art)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Code Quality & Patterns](#3-code-quality--patterns)
4. [Business Logic Review](#4-business-logic-review)
5. [UX/UI Review — Web App](#5-uxui-review--web-app)
6. [Admin Panel Review](#6-admin-panel-review)
7. [Landing Page Review](#7-landing-page-review)
8. [Security Audit](#8-security-audit)
9. [Performance & Scalability](#9-performance--scalability)
10. [Collab Server Review](#10-collab-server-review)
11. [Database & Schema Review](#11-database--schema-review)
12. [Testing Coverage](#12-testing-coverage)
13. [Summary Scores](#13-summary-scores)

---

## 1. Executive Summary

Script Workspace is a **production-grade AI-powered screenplay editor** built on a modern stack (Next.js 15, React 19, tRPC v11, Prisma 6, Hocuspocus/Yjs). The codebase demonstrates **professional quality** with consistent patterns, strong type safety, and thoughtful architecture.

### Key Strengths
- Clean monorepo structure with clear package boundaries
- Comprehensive 6-provider AI system with circuit breaker and fallback
- Real-time collaboration via Hocuspocus + Yjs with dual storage
- Strong auth/authz with Better Auth + role-based project access
- Full Zod validation on all API inputs
- 21 well-structured tRPC routers with consistent patterns

### Critical Issues Found
| # | Issue | Severity | Location |
|---|-------|----------|----------|
| 1 | Memory leak in collab `fallbackStore` Map | **CRITICAL** | `apps/collab/src/index.ts` |
| 2 | Memory leak in collab `lastLogTime` Map | **CRITICAL** | `apps/collab/src/activity.ts` |
| 3 | No error handling on admin API calls | **HIGH** | `apps/admin/` (all pages) |
| 4 | No pagination on admin users/usage pages | **HIGH** | `apps/admin/` |
| 5 | Missing CASCADE on DocumentRevision FK | **MEDIUM** | `packages/db/prisma/schema.prisma` |
| 6 | Email enumeration in member invite | **MEDIUM** | `packages/api/src/routers/member.ts` |
| 7 | Race condition in comment resolve toggle | **LOW** | `packages/api/src/routers/comment.ts` |

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENTS                               │
│  Browser (Next.js SSR + CSR) ──► WebSocket (Yjs sync)   │
└──────────┬──────────────────────────┬───────────────────┘
           │                          │
     ┌─────▼─────┐            ┌──────▼──────┐
     │  apps/web  │            │ apps/collab │
     │  (port     │            │ (port 3004) │
     │  3001/3002)│            │ Hocuspocus  │
     └─────┬──────┘            └──────┬──────┘
           │ tRPC                     │ Prisma
     ┌─────▼──────┐                   │
     │packages/api│◄──────────────────┘
     │  21 routers│
     └─────┬──────┘
           │
    ┌──────▼──────┐    ┌────────────┐
    │packages/db  │    │packages/ai │
    │  Prisma 6   │    │ 6 providers│
    │ PostgreSQL  │    │ + prompts  │
    └─────────────┘    └────────────┘
```

**Apps:** 3 (web, admin, collab)
**Packages:** 6 (api, db, ai, editor, types, ui)
**DB Models:** 31
**tRPC Routers:** 21
**AI Providers:** 6 (OpenAI, Anthropic, DeepSeek, Gemini, Yandex, Grok)

---

## 3. Code Quality & Patterns

### 3.1 What's Done Well

**Consistent tRPC Pattern** — All 21 routers follow the same structure:
- Zod input validation → auth check → business logic → Prisma query → response
- `protectedProcedure` for authenticated, `aiProcedure` for rate-limited AI calls
- `assertProjectAccess` / `assertEditorAccess` guards

**Type Safety** — TypeScript strict mode with full Zod → tRPC type inference:
```
Zod schema → z.infer<> → tRPC input → auto-typed handler → typed response
```

**State Management** — Hybrid approach (React Query + local state + URL params) is appropriate for this app's complexity. No over-engineering with Redux/Zustand.

**Error Boundaries** — Three levels: global, workspace, project-specific.

### 3.2 Issues Found

| Issue | Severity | Files |
|-------|----------|-------|
| Type escape hatches (`as any`, `as unknown as`) in AI router | Medium | `packages/api/src/routers/ai.ts` |
| `z.any()` for JSON fields instead of proper schema | Medium | `bible.ts`, `note.ts` |
| Hardcoded Russian error messages in server code | Low | `packages/api/src/routers/ai.ts:545` |
| Hardcoded provider list duplicated across files | Low | `apps/admin/api-keys/page.tsx` |
| `boolean | Boolean` type union in permissions | Low | `apps/collab/src/permissions.ts` |
| No structured logging (uses `console.error` everywhere) | Medium | All apps |

### 3.3 Code Organization

**Good:**
- Clean package boundaries (db, api, ai, types, editor)
- Routers map 1:1 to domain entities
- Custom hooks for editor logic (`useSceneSync`, `useAutoRevision`, `useScriptStats`)
- Lazy-loaded workspace panels with Suspense

**Needs Improvement:**
- `ai.ts` router is 41 KB — should be split into sub-routers (rewrite, analysis, generation)
- Some components are monolithic (e.g., `editor-area.tsx`, `workspace-shell.tsx`)
- Missing JSDoc on complex utility functions

---

## 4. Business Logic Review

### 4.1 Project Management
- **CRUD**: Complete lifecycle (create, update, soft delete, restore, permanent delete) ✅
- **Bulk operations**: Delete, archive ✅
- **Roles**: OWNER, EDITOR, COMMENTER, VIEWER — properly enforced ✅
- **TV Series support**: Episodes with auto-numbering + unique documents ✅

### 4.2 Document Management
- **Dual storage**: Yjs binary + JSON content + plain text for FTS ✅
- **Versioning**: Auto-revision every 30 min (FNV-1a hash change detection) ✅
- **Drafts**: Manual snapshots with numbered versions ✅
- **Sort order**: Transactional to prevent race conditions ✅

### 4.3 AI Integration
- **6-provider system** with circuit breaker (3 failures → 60s cooldown) ✅
- **Fallback chain**: OpenAI → Anthropic → DeepSeek → Gemini → Grok → Yandex ✅
- **Features**: Chat, Rewrite, Format, Scene Analysis, Character Analysis, Structure Analysis, Logline, Synopsis ✅
- **Usage logging**: Provider, model, tokens in/out, cost, duration ✅
- **Context composition**: Current scene + adjacent + document summary + bible + pins ✅

### 4.4 Collaboration
- **Real-time editing** via Hocuspocus + Yjs ✅
- **Role-based access**: Viewers/commenters get read-only mode ✅
- **Session revalidation**: Every 5 min (catches role changes, expired sessions) ✅
- **Activity logging**: Join/leave + edit actions with debounce ✅

### 4.5 Business Logic Gaps

| Gap | Impact | Description |
|-----|--------|-------------|
| No billing/payment system | HIGH | Pricing tiers shown on landing but not enforced |
| No project limits per tier | HIGH | Free tier "1 project" not implemented |
| No word/page limits | MEDIUM | No enforcement of plan limits |
| No email verification flow | MEDIUM | Users can sign up with any email |
| No password reset | MEDIUM | No forgot password functionality visible |
| No export format limits per tier | LOW | All formats available to all users |
| RAGChunk model unused | LOW | Schema exists but no code uses it |
| Knowledge graph partially implemented | LOW | API exists, UI exists, but generation flow unclear |

---

## 5. UX/UI Review — Web App

### 5.1 Workspace Design

**Strengths:**
- 10 workspace modes (script, bible, outline, characters, locations, versions, graph, one-pager, notes, scene board) — comprehensive
- Three-panel layout (sidebar + editor + right panel) with resizable panels
- Floating selection toolbar (Rewrite, Pin, Comment, Format)
- Chat panel with streaming responses and context awareness
- Global search (Cmd+Shift+F) and in-editor find/replace
- Import (Fountain) and export (PDF, DOCX, FDX) with options
- Keyboard shortcuts reference modal

**Issues:**
| Issue | Severity | Description |
|-------|----------|-------------|
| Mobile sidebar doesn't collapse | HIGH | Sidebar always visible, unusable on phones |
| No `prefers-reduced-motion` support | MEDIUM | Animations can't be disabled for motion-sensitive users |
| No workspace mode persistence | MEDIUM | Mode resets on page reload (should use URL or localStorage) |
| Limited alt text on icons | LOW | Some icon-only buttons lack `aria-label` |
| No offline indicator/fallback | LOW | No UI feedback when network drops (except collab status) |
| No undo/redo UI buttons | LOW | Only keyboard shortcuts (Cmd+Z) |

### 5.2 Editor Experience

**Strengths:**
- Custom TipTap schema for screenplay (sceneHeading, action, character, dialogue, parenthetical, transition)
- Autosave with visual indicator (idle → saving → saved → error)
- Dual-language scene parsing (INT./EXT. + ИНТ./НАТ.)
- Collaboration indicators (online users, connection status)
- Scene navigator for quick jumping
- Script stats footer (characters, pages, scenes)

**Issues:**
- No keyboard shortcut to switch block types (e.g., Tab to cycle through screenplay elements — industry standard)
- No visual page breaks (screenplay standard: 1 page ≈ 55 lines)
- Scene numbering not visible in editor (only in export)

### 5.3 Comment System
- Threaded comments with resolve/delete ✅
- COMMENTER role can create/reply but not delete ✅
- Comment marks on text ranges ✅

**Issue:** Comment thread anchoring might drift during collaborative editing if text around anchor changes (common Yjs challenge — needs testing).

### 5.4 Dashboard
- Grid and table view for projects ✅
- Search, sort, filter by status ✅
- Bulk operations (delete, archive) ✅
- Loading skeletons ✅
- Beta gate (non-approved users see queue screen) ✅

### 5.5 Profile
- Name, position, company, language preference ✅
- Simple and functional ✅

---

## 6. Admin Panel Review

### 6.1 Features
| Feature | Status | Quality |
|---------|--------|---------|
| Dashboard KPIs | ✅ | Good — users, providers, costs, requests |
| API Key Management | ✅ | Good — encrypted storage, mask/reveal, enable/disable |
| Model Configuration | ✅ | Good — pricing, enable/disable per model |
| User Management | ✅ | Basic — search, beta toggle |
| Usage Analytics | ✅ | Good — time ranges, by-provider, by-user |

### 6.2 Security
- CSRF protection via custom header ✅
- HMAC-signed session cookies ✅
- Bcrypt password hashing ✅
- Login rate limiting (5 attempts / 15 min per IP) ✅
- API key encryption at rest (AES-256-GCM) ✅

### 6.3 Issues

| Issue | Severity | Description |
|-------|----------|-------------|
| **No error handling on fetch calls** | HIGH | All API calls silently fail — no error UI, no retries |
| **No pagination** | HIGH | Users page loads ALL users; usage loads top 50 only |
| **In-memory rate limiting** | MEDIUM | Lost on server restart — window for brute force |
| **No audit logging** | MEDIUM | Admin actions not tracked (ActivityLog model exists!) |
| **No input validation on server** | MEDIUM | Model costs accept negative/NaN values |
| **No admin action confirmation** | MEDIUM | No "are you sure?" for destructive actions (except key delete) |
| **No loading skeletons** | LOW | Abrupt content shifts |
| **No toast notifications** | LOW | No feedback on save/update actions |
| **No error boundaries** | LOW | Unhandled errors crash the page |
| **No 404/500 pages** | LOW | Missing error pages |

---

## 7. Landing Page Review

### 7.1 Structure
1. **Hero** — Animated screenplay demo with live typing effect
2. **Features** — 8 cards (formatting, autocomplete, rewrite, chat, versions, series, comments, export)
3. **Pricing** — 3 tiers (Free / Pro / Max)
4. **FAQ** — Collapsible Q&A
5. **CTA** — Sign-up buttons

### 7.2 What's Good
- Custom typography (Playfair Display + IBM Plex Mono) creates professional feel
- Framer Motion scroll animations
- Glass-morphism panels
- Russian screenplay demo content matches target audience
- Fully responsive (Tailwind breakpoints)

### 7.3 Issues

| Issue | Severity | Description |
|-------|----------|-------------|
| **Pricing not enforced** | HIGH | Tiers shown but no payment system — users can access all features for free |
| **No social proof** | MEDIUM | No testimonials, user count, or logos |
| **No video/GIF demo** | MEDIUM | Static code demo — video would show product better |
| **No SEO metadata** | MEDIUM | Missing Open Graph tags, Twitter cards, structured data |
| **No analytics** | MEDIUM | No GA, Yandex.Metrika, or event tracking |
| **CTA buttons go to sign-up only** | LOW | "Начать бесплатно" and pricing buttons should differentiate |
| **No language toggle** | LOW | Page only in Russian, despite product supporting English |
| **Pricing currency not specified** | LOW | No ₽ or $ signs on future pricing |
| **FAQ answers are brief** | LOW | Could be more detailed for SEO |

---

## 8. Security Audit

### 8.1 Strengths
| Measure | Status |
|---------|--------|
| SQL injection protection (Prisma ORM) | ✅ |
| Session-based auth (Better Auth) | ✅ |
| API key encryption at rest (AES-256-GCM) | ✅ |
| Rate limiting (Redis + fallback) | ✅ |
| Input validation (Zod on all inputs) | ✅ |
| CSRF protection on admin panel | ✅ |
| Role-based access control | ✅ |
| 404 for unauthorized (no info leak) | ✅ |

### 8.2 Vulnerabilities

| Vulnerability | Severity | Description | Fix |
|---------------|----------|-------------|-----|
| **Email enumeration** | MEDIUM | `member.ts:74` — "User with this email not found" reveals email existence | Use generic message |
| **No CSP headers** | MEDIUM | No Content-Security-Policy on any app | Add CSP in middleware |
| **In-memory rate limits on collab** | MEDIUM | Restart resets all limits | Use Redis |
| **No session invalidation list** | LOW | Can't revoke specific sessions server-side | Add session blacklist |
| **Admin session no rotation** | LOW | Token doesn't rotate on sensitive actions | Regenerate on key changes |
| **No X-Frame-Options** | LOW | Clickjacking possible | Add `DENY` header |
| **Decryption errors silently caught** | LOW | `apps/admin/api/admin/keys/route.ts:28` — masks corruption | Log to monitoring |

### 8.3 Missing Security Features
- No 2FA for admin
- No IP whitelist for admin
- No webhook signing for external integrations
- No request signing between services
- No secrets rotation mechanism

---

## 9. Performance & Scalability

### 9.1 Good Patterns
- React Query caching (30s staleTime) ✅
- Lazy-loaded workspace panels with Suspense ✅
- Prisma selective queries (`select` instead of full objects) ✅
- `Promise.all` for parallel DB queries in admin ✅
- Debounced scene sync (5s) and activity logging (30s) ✅
- Auto-revision with content hash (avoids duplicate snapshots) ✅

### 9.2 Performance Issues

| Issue | Impact | Description |
|-------|--------|-------------|
| **No FTS index on contentText** | HIGH | PostgreSQL full-text search without GIN index — slow on large datasets |
| **Admin loads all users** | HIGH | No pagination — will break at 1000+ users |
| **Export unbounded** | MEDIUM | PDF/DOCX generation from large documents — no size limit, no timeout |
| **Knowledge graph JSON unlimited** | MEDIUM | `project.knowledgeGraph` has no size constraint |
| **Memory leak in collab Maps** | HIGH | `fallbackStore` and `lastLogTime` grow indefinitely |
| **No CDN for static assets** | LOW | Images/fonts served from Next.js |
| **No query result caching** | LOW | Redis available but not used for query caching |

---

## 10. Collab Server Review

### 10.1 Architecture
- Hocuspocus v2.15 on port 3004
- Redis extension for multi-instance sync
- Database extension for Prisma persistence
- Better Auth cookie validation on WebSocket handshake
- Role-based read-only mode

### 10.2 Good Design
- Dual storage (yjsState + JSON content + contentText) — excellent
- Lazy migration from old JSON → Y.Doc
- Retry with exponential backoff (1s, 2s, 4s)
- Session revalidation every 5 minutes
- Activity logging with debounce

### 10.3 Critical Issues

| Issue | Severity | Fix |
|-------|----------|-----|
| **`fallbackStore` Map never cleaned** | CRITICAL | Add `setInterval` to purge expired entries |
| **`lastLogTime` Map never cleaned** | CRITICAL | Add periodic cleanup |
| **Race condition in fallback rate limiter** | LOW | Acceptable for single-threaded Node.js |
| **`boolean \| Boolean` type union** | LOW | Change to `boolean` |
| **No nginx config in repo** | INFO | WS proxy (`/ws → :3004`) needed for production |

---

## 11. Database & Schema Review

### 11.1 Schema Quality: B+

**Good:**
- 31 models with clear relationships
- Proper cascade deletes on most relations
- Good indexing: `[projectId]`, `[projectId, deletedAt]`, `[projectId, createdAt]`
- Enums for roles, statuses, types
- Soft delete on core entities (Project, Document, Episode)

### 11.2 Issues

| Issue | Severity | Description |
|-------|----------|-------------|
| **No CASCADE on DocumentRevision** | MEDIUM | Orphaned revisions if document hard-deleted |
| **Soft delete inconsistent** | MEDIUM | Some models use `deletedAt`, others don't (Comment, Suggestion) |
| **RAGChunk unused** | LOW | Schema exists but no code references it |
| **No composite index `[projectId, userId]`** | LOW | Missing on ProjectMember for "user's projects" queries |
| **JSON columns no DB-level validation** | LOW | Relies entirely on app layer (Zod) |
| **No GIN index for FTS** | HIGH | `contentText` used for full-text search without index |

---

## 12. Testing Coverage

### 12.1 Current State

| Area | Tests | Status |
|------|-------|--------|
| AI package (unit) | ✅ | Template engine, prompt loader, composition |
| AI package (integration) | ✅ | All 6 providers × all task types |
| Web app | ❌ | No unit/component/E2E tests |
| Admin panel | ❌ | No tests |
| Collab server | ❌ | No tests |
| API routers | ❌ | No tests |
| Database layer | ❌ | No migration tests |

### 12.2 Test Gaps
- No E2E tests (Playwright/Cypress)
- No component tests (React Testing Library)
- No API integration tests
- No load testing for WebSocket server
- No security testing (OWASP ZAP, etc.)

---

## 13. Summary Scores

| Category | Score | Notes |
|----------|-------|-------|
| **Architecture** | A | Clean monorepo, clear boundaries, modern stack |
| **Code Quality** | B+ | Consistent patterns, some type escapes, large files |
| **Business Logic** | B+ | Comprehensive features, billing not implemented |
| **Type Safety** | A- | Full Zod + tRPC, few `as any` escapes |
| **Auth/Security** | B+ | Strong foundation, needs CSP/headers, email enum fix |
| **UX/UI (Web)** | B+ | Rich workspace, needs mobile support, a11y improvements |
| **Admin Panel** | B- | Functional but needs error handling, pagination, audit |
| **Landing Page** | B- | Good design, missing SEO, analytics, social proof |
| **Performance** | B | Good caching patterns, memory leaks in collab, missing indexes |
| **Collab Server** | B | Excellent design, critical memory leaks |
| **Database** | B+ | Well-structured, needs index and cascade fixes |
| **Testing** | C | Only AI package tested, rest untested |
| **Documentation** | A- | CLAUDE.md, ARCHITECTURE.md, ROADMAP.md — thorough |
| **Overall** | **B+** | Production-quality project with known gaps to address |
