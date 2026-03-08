# Improvement Proposals — Script Workspace

**Date:** 2026-03-07
**Based on:** Full code review (see REVIEW_REPORT.md)

Improvements sorted by priority: P0 (critical/urgent) → P3 (nice-to-have).

---

## P0 — Critical Fixes (do immediately)

### 1. Fix Memory Leaks in Collab Server

**Problem:** Two Maps grow indefinitely, will cause OOM crash.

**Files:**
- `apps/collab/src/index.ts` — `fallbackStore` Map
- `apps/collab/src/activity.ts` — `lastLogTime` Map

**Fix:** Add cleanup intervals.

```typescript
// index.ts — add after fallbackStore declaration
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of fallbackStore) {
    if (now > entry.resetAt) fallbackStore.delete(key);
  }
}, 60_000); // Clean every minute

// activity.ts — add after lastLogTime declaration
setInterval(() => {
  const now = Date.now();
  for (const [key, time] of lastLogTime) {
    if (now - time > 60_000) lastLogTime.delete(key);
  }
}, 60_000);
```

**Effort:** 30 min | **Impact:** Prevents production crashes

---

### 2. Add Error Handling to Admin Panel API Calls

**Problem:** All fetch() calls ignore errors — mutations silently fail.

**Files:** All `apps/admin/app/(admin)/` pages

**Fix:** Add try-catch + error state + toast notifications.

```typescript
// Pattern for all pages:
const [error, setError] = useState<string | null>(null);

const fetchData = useCallback(async () => {
  try {
    setLoading(true);
    const res = await fetch("/api/admin/...");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    setData(await res.json());
  } catch (err) {
    setError(err instanceof Error ? err.message : "Failed to load");
  } finally {
    setLoading(false);
  }
}, []);
```

**Effort:** 2-3 hours | **Impact:** Prevents silent data loss for admins

---

### 3. Add Missing Database Index for FTS

**Problem:** `contentText` used for PostgreSQL full-text search without GIN index — slow on large datasets.

**Fix:** Add migration:

```sql
CREATE INDEX document_content_text_fts_idx
  ON "Document"
  USING GIN (to_tsvector('russian', "contentText"));
```

**Effort:** 15 min | **Impact:** 10-100x faster search

---

### 4. Fix CASCADE on DocumentRevision

**Problem:** Hard-deleting a document leaves orphaned revisions.

**Fix:** In schema.prisma:

```prisma
model DocumentRevision {
  document   Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
}
```

**Effort:** 15 min | **Impact:** Prevents orphaned data

---

### 5. Fix Safari UI Issues

**Problem:** Interface has visual/layout bugs in Safari — elements render incorrectly, possible CSS incompatibilities (flexbox/grid gaps, backdrop-filter, scrolling behavior).

**Fix:**
- Audit all CSS for Safari-incompatible properties
- Add `-webkit-` prefixes where needed
- Test sticky positioning, `dvh` units, `gap` in flexbox
- Fix overflow/scrolling behavior differences

**Effort:** 4-8 hours | **Impact:** Cross-browser compatibility for Safari users

---

### 6. Fix Print Menu "White on White"

**Problem:** Print dialog/menu renders white text on white background — completely unreadable.

**Fix:**
- Add proper `@media print` styles
- Ensure print-specific color scheme uses dark text on white background
- Override dark theme colors for print context
- Test print preview in all browsers

```css
@media print {
  * {
    color: #000 !important;
    background: #fff !important;
  }
  /* Hide non-printable UI elements */
  .sidebar, .toolbar, .chat-panel {
    display: none !important;
  }
}
```

**Effort:** 2-3 hours | **Impact:** Print functionality is completely broken without this

---

## P1 — Important Improvements (next sprint)

### 7. Admin: AI Model Usage Dashboard with Detailed Statistics

**Problem:** Admin panel only shows which provider a user used, but no breakdown by specific model, no usage graphs, no cost tracking per model.

**Fix:**
- Add `model` field tracking to all AI requests (store in DB alongside provider)
- Build dashboard page with:
  - Per-model usage counts (requests, tokens in/out)
  - Cost breakdown by model (using model cost config)
  - Time-series graphs (daily/weekly/monthly usage trends)
  - Top users by model usage
  - Provider vs model distribution charts
- Use Recharts or Chart.js for visualization

**Effort:** 2-3 days | **Impact:** Critical for cost management and usage analysis

---

### 8. Admin: AI Response & Error Log Viewer

**Problem:** No visibility into what AI responses users see, what errors/notifications are shown in the UI. Admins have no way to debug user-reported issues.

**Fix:**
- Log all AI responses (or summaries) with metadata: userId, model, task type, status, timestamp
- Log all user-facing errors and notifications (toast messages, error screens)
- Build admin panel page:
  - Filterable table: by user, date range, status (success/error), provider, model
  - Error details view with full request/response context
  - Real-time error feed / "All Notifications" view
- Add DB model for `AiResponseLog` with fields: userId, provider, model, taskType, status, errorMessage, requestTokens, responseTokens, durationMs, timestamp

**Effort:** 2-3 days | **Impact:** Full observability into AI quality and errors

---

### 9. "Report to Admin" Button + Admin Feedback Panel

**Problem:** Users have no way to report issues from within the app. Admin has no visibility into user-reported problems or when they occurred.

**Fix:**
- Add "Report a Problem" button in the UI (e.g., in the help menu or as a floating action):
  - Captures: user message, current page/context, timestamp, browser info
  - Optionally: auto-attach last AI request/response, console errors, screenshot
- Create DB model `UserReport`: userId, message, context (page, action), aiRequestId (optional), status (new/in_progress/resolved), createdAt
- Build admin panel page:
  - List of all user reports with status badges
  - Timeline view — see exactly when the user reported the issue
  - Link to related AI response log if applicable
  - Admin can respond / change status

**Effort:** 2-3 days | **Impact:** Direct user feedback loop, faster issue resolution

---

### 10. Add Pagination to Admin Panel

**Problem:** Users page loads ALL users, usage shows only top 50.

**Fix:** Add cursor-based pagination to `/api/admin/users` and `/api/admin/usage`.

```typescript
// API: accept page/limit params
const { page = 1, limit = 50 } = searchParams;
const users = await prisma.user.findMany({
  skip: (page - 1) * limit,
  take: limit,
  // ...existing query
});
const total = await prisma.user.count({ where });
```

**Effort:** 4-6 hours | **Impact:** Admin panel works at scale

---

### 11. Fix Email Enumeration in Member Invite

**Problem:** `member.ts:74` returns "User with this email not found" — reveals email existence.

**Fix:**
```typescript
// Before (leaks info):
message: "User with this email not found. They need to register first."

// After (safe):
message: "Invitation sent. If the user is registered, they will see it."
```

**Effort:** 15 min | **Impact:** Prevents email harvesting

---

### 12. Add CSP and Security Headers

**Problem:** No Content-Security-Policy, X-Frame-Options, etc.

**Fix:** Add headers in `next.config.ts` for both apps:

```typescript
headers: async () => [{
  source: "/(.*)",
  headers: [
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" },
  ],
}],
```

**Effort:** 1 hour | **Impact:** Prevents XSS, clickjacking

---

### 13. Add Admin Audit Logging

**Problem:** Admin actions not tracked. `ActivityLog` model exists but admin doesn't use it.

**Fix:** Log every mutation in admin API routes:

```typescript
// In each POST/PATCH/DELETE handler:
await prisma.activityLog.create({
  data: {
    userId: "admin",
    action: "admin:update_api_key",
    details: { provider, action: "toggle", newValue: isActive },
  },
});
```

**Effort:** 2-3 hours | **Impact:** Full audit trail for compliance

---

### 14. Add Server-Side Validation to Admin API Routes

**Problem:** Model costs accept negative/NaN. API keys not validated before encryption.

**Fix:** Add Zod validation in route handlers:

```typescript
const updateModelSchema = z.object({
  id: z.string(),
  isEnabled: z.boolean().optional(),
  costInputPerMillion: z.number().min(0).max(1000).optional(),
  costOutputPerMillion: z.number().min(0).max(1000).optional(),
});
```

**Effort:** 2 hours | **Impact:** Prevents garbage data in DB

---

### 15. Split AI Router

**Problem:** `packages/api/src/routers/ai.ts` is 41 KB — too large, hard to maintain.

**Fix:** Split into sub-routers:

```
routers/ai/
  ├── index.ts        (mergeRouters)
  ├── rewrite.ts      (rewrite, format)
  ├── analysis.ts     (analyzeScene, analyzeCharacters, analyzeStructure)
  ├── generation.ts   (generateLogline, generateSynopsis)
  └── shared.ts       (aiProcedure, helpers)
```

**Effort:** 3-4 hours | **Impact:** Maintainability

---

## P2 — UX/UI Improvements

### 16. Mobile-Responsive Sidebar

**Problem:** Workspace sidebar always visible — unusable on phones/tablets.

**Fix:**
- Add hamburger menu toggle on `< md` breakpoints
- Overlay sidebar with backdrop
- Auto-close on mode selection

**Effort:** 4-6 hours | **Impact:** Mobile usability

---

### 17. Persist Workspace Mode in URL

**Problem:** Workspace mode resets on page reload.

**Fix:** Use URL search params:
```
/project/abc/script/doc123?mode=characters
```

**Effort:** 1-2 hours | **Impact:** Shareable workspace states, no data loss on refresh

---

### 18. Add `prefers-reduced-motion` Support

**Problem:** Framer Motion animations can't be disabled for motion-sensitive users.

**Fix:**
```typescript
const prefersReducedMotion = usePrefersReducedMotion();
// Pass to Framer Motion:
<motion.div animate={prefersReducedMotion ? false : { ... }} />
```

**Effort:** 2 hours | **Impact:** Accessibility compliance (WCAG 2.1 AA)

---

### 19. Add Toast Notifications to Admin Panel

**Problem:** No feedback after save/update/delete actions.

**Fix:** Add Sonner (already used in web app):
```bash
pnpm add sonner --filter admin
```

**Effort:** 2 hours | **Impact:** Admin UX

---

### 20. Landing Page SEO & Analytics

**Problem:** No meta tags, Open Graph, analytics.

**Fix:**
- Add `metadata` export in `app/page.tsx` with OG tags
- Add Yandex.Metrika or Plausible analytics
- Add structured data (JSON-LD for SoftwareApplication)

**Effort:** 3-4 hours | **Impact:** Discoverability, conversion tracking

---

### 21. Add Social Proof to Landing

**Problem:** No testimonials, user count, or credibility signals.

**Fix:**
- Add "Используют N+ сценаристов" counter
- Add 2-3 testimonial quotes (can be from beta users)
- Add product screenshot/video demo

**Effort:** 3-4 hours | **Impact:** Conversion rate

---

## P3 — Nice-to-Have

### 22. Add E2E Tests

**Problem:** No E2E tests for critical paths.

**Fix:** Add Playwright tests for:
- Sign in → create project → open editor → type text → save
- AI chat → send message → receive response
- Export → download PDF
- Admin → update API key → verify

**Effort:** 1-2 weeks | **Impact:** Regression prevention

---

### 23. Add Component Tests

**Problem:** No React component tests.

**Fix:** Add Vitest + React Testing Library for:
- Dashboard project list filtering
- Editor selection toolbar behavior
- Comment thread creation
- Chat message streaming

**Effort:** 1-2 weeks | **Impact:** Component reliability

---

### 24. Structured Logging

**Problem:** `console.error` everywhere — no log levels, no correlation IDs.

**Fix:** Use Pino or Winston:

```typescript
import pino from "pino";
const logger = pino({ level: "info" });

// Replace console.error:
logger.error({ err, userId, projectId }, "Failed to save document");
```

**Effort:** 1-2 days | **Impact:** Debugging, monitoring

---

### 25. Add Email Verification and Password Reset

**Problem:** No email verification, no forgot password.

**Fix:** Better Auth supports both — enable in config:

```typescript
// packages/api/src/auth.ts
emailVerification: {
  sendVerificationEmail: async ({ user, url }) => {
    await sendEmail(user.email, "Verify", url);
  },
},
```

**Effort:** 1-2 days | **Impact:** Security, user trust

---

### 26. Visual Page Breaks in Editor

**Problem:** Screenwriters need to see page breaks (industry standard: 55 lines ≈ 1 page).

**Fix:** TipTap decoration plugin that inserts visual page break lines.

**Effort:** 2-3 days | **Impact:** Professional editor feel

---

### 27. Keyboard Shortcuts for Block Types

**Problem:** No keyboard shortcut to switch between screenplay block types.

**Industry standard:**
- Tab → cycle: Action → Character → Dialogue → Parenthetical → Transition
- Enter after Character → auto-switch to Dialogue

**Effort:** 2-3 days | **Impact:** Writer productivity

---

### 28. Soft Delete Consistency

**Problem:** Some models use `deletedAt`, others don't.

**Fix:** Add `deletedAt` to CommentThread, Suggestion, or document the intentional difference.

**Effort:** 2-4 hours | **Impact:** Data recovery, consistency

---

### 29. Redis-Based Collab Rate Limiting

**Problem:** In-memory fallback lost on restart.

**Fix:** Already using Redis for Hocuspocus extension — use same connection for rate limiting.

**Effort:** 1-2 hours | **Impact:** Consistent rate limiting

---

## Summary by Priority

| Priority | Count | Effort | Description |
|----------|-------|--------|-------------|
| **P0** | 6 | 2-3 days | Critical fixes (memory leaks, indexes, cascades, Safari, print) |
| **P1** | 9 | 2-3 weeks | Important (admin dashboards, AI logs, user reports, pagination, security) |
| **P2** | 6 | 1-2 weeks | UX/UI (mobile, persistence, a11y, SEO) |
| **P3** | 8 | 4-6 weeks | Nice-to-have (tests, logging, editor features) |

**Recommended order:** P0 → P1 (items 7-9, admin AI features) → P1 (items 10-14) → P2 (items 16-17) → P1 (item 15) → P2 (items 18-21) → P3
