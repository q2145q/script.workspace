# Testing & Deployment Plan — All Remaining Features

## Status

All 10 features from the original plan are **implemented but uncommitted**.
This plan covers testing, fixing, committing, and deploying everything.

---

## Implemented Features (awaiting test & commit)

| # | Feature | Key Files | Status |
|---|---------|-----------|--------|
| 1 | Collab server (Yjs + Hocuspocus) | `apps/collab/` | Bug fixed |
| 2 | Per-user AI chat | `packages/api/src/routers/chat.ts`, `apps/web/app/api/chat/stream/route.ts` | Done |
| 3 | Activity log + online users | `activity-panel.tsx`, `online-users.tsx`, `collab-status.tsx` | Done |
| 4 | Notes page (collaborative) | `notes-panel.tsx`, `packages/api/src/routers/note.ts` | Done |
| 5 | Comment popover (Google Docs style) | `comment-popover.tsx` | Done |
| 6 | Suggestion popover (rewrites as comments) | `suggestion-popover.tsx` | Done |
| 7 | One Pager page | `one-pager-panel.tsx` | Done |
| 8 | Autocomplete bug fix | `autocomplete-extension.ts` (500ms grace) | Done |
| 9 | Version diffs & restore | `versions-panel.tsx` | Done |
| 10 | Headless schema for collab | `packages/editor/src/schema.ts` | Done |

---

## Phase 1: Automated Testing

**Goal:** Catch TypeScript errors and verify AI integration hasn't broken.

```bash
# 1.1 Type-check entire project
pnpm type-check

# 1.2 AI unit tests (template engine, prompt loader, composition)
pnpm test:ai

# 1.3 AI integration smoke tests (one request per provider)
pnpm test:ai:integration -- --grep "Smoke"
```

**Exit criteria:** All commands pass with zero errors.
**If fails:** Fix errors before proceeding.

---

## Phase 2: Build Verification

**Goal:** Ensure production build succeeds.

```bash
# 2.1 Full build
pnpm build
```

**Exit criteria:** Build completes successfully for all packages and apps.
**If fails:** Fix build errors, re-run.

---

## Phase 3: Manual Testing — Dev Server

**Goal:** User verifies each feature in the browser.

### Start dev server:
```bash
cd apps/web && npx next dev --turbopack --hostname 0.0.0.0 --port 3001
```

### Also start collab server (for collaborative features):
```bash
cd apps/collab && node dist/index.js
# Or: npx tsx src/index.ts
```

### Checklist — what to test at http://host:3001:

#### 3.1 Notes Panel
- [ ] Open project → click "Notes" in sidebar
- [ ] Create a new note (+ button)
- [ ] Type text in the note editor
- [ ] Rename a note (pencil icon)
- [ ] Delete a note (trash icon)
- [ ] Verify notes persist after page reload

#### 3.2 One Pager
- [ ] Click "One Pager" in sidebar
- [ ] Verify title, authors, genre display correctly
- [ ] Click "Generate" on logline → verify AI generates logline
- [ ] Click "Generate" on synopsis → verify AI generates synopsis
- [ ] Click "Copy All" → paste somewhere to verify content
- [ ] Characters section shows project characters

#### 3.3 Comment Popover
- [ ] Open script editor
- [ ] Select text → add a comment (via comments panel)
- [ ] Click the highlighted comment text → popover appears
- [ ] Reply to the comment in the popover
- [ ] Resolve the comment (check icon)
- [ ] Delete the comment (trash icon)
- [ ] Click outside popover → it closes

#### 3.4 Suggestion Popover (Rewrites)
- [ ] Select text in editor → use AI Rewrite
- [ ] Click the suggestion decoration → popover appears
- [ ] Verify original (red) vs new (green) text shown
- [ ] Click "Apply" → text replaces in editor
- [ ] Click "Undo" within 30 seconds → text reverts
- [ ] Try "Else" → triggers a new rewrite
- [ ] Try "Dismiss" → suggestion removed

#### 3.5 Versions Panel
- [ ] Click "Versions" in sidebar
- [ ] Save a draft → appears in list
- [ ] Click a draft → preview opens
- [ ] Toggle "Diff" mode → select two drafts
- [ ] Verify red/green diff highlighting
- [ ] Click "Restore" → document reverts to that draft

#### 3.6 Activity Panel
- [ ] Open right panel → "Activity" tab
- [ ] Verify activity entries show (edits, comments, etc.)
- [ ] Check timestamps are reasonable

#### 3.7 Autocomplete Bug Fix
- [ ] Open a script that starts with a scene heading
- [ ] Verify autocomplete dropdown does NOT appear immediately
- [ ] Start typing in a scene heading → autocomplete should appear normally

#### 3.8 Per-User Chat
- [ ] Open right panel → "Chat" tab
- [ ] Send a message → get AI response
- [ ] If possible, open in another browser/incognito → verify separate chat history

#### 3.9 Collab Features (if collab server running)
- [ ] Open same document in two browser tabs
- [ ] Type in one tab → changes appear in the other
- [ ] Check "Online Users" indicator shows multiple users
- [ ] Check "Collab Status" shows "Synced"

### Stop dev server after testing:
```bash
kill $(lsof -ti:3001)
```

---

## Phase 4: Fix Issues

**Goal:** Address any bugs found during manual testing.

- Fix each bug, re-run automated tests (`pnpm type-check && pnpm test:ai`)
- Re-verify the specific feature in dev server
- Iterate until all checklist items pass

---

## Phase 5: Commit & Push

**Goal:** Commit all verified changes.

```bash
# Stage all changes
git add -A

# Commit with descriptive message
git commit -m "feat: collaborative editing, notes, one-pager, comments, suggestions, versions, activity"

# Push
git push origin master
```

---

## Phase 6: Production Deployment

### 6.1 Rebuild web app
```bash
pnpm build
pm2 restart script-workspace
```

### 6.2 Verify production web
- [ ] Open https://script.yomimovie.art
- [ ] Test notes, one-pager, comments, versions, chat

### 6.3 Deploy collab server

#### Nginx config (add to site config):
```nginx
location /ws {
    proxy_pass http://localhost:3004;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 86400;
}
```

#### Set env & rebuild:
```bash
# Set WebSocket URL for production
export NEXT_PUBLIC_COLLAB_WS_URL=wss://script.yomimovie.art/ws

# Rebuild web with new env
pnpm build

# Start collab server via PM2
pm2 start ecosystem.config.cjs --only script-collab

# Restart web to use new WS URL
pm2 restart script-workspace
```

### 6.4 Verify collab in production
- [ ] Open document in two browsers
- [ ] Verify real-time sync works
- [ ] Check online users indicator
- [ ] Check connection status shows "Synced"

---

## Rollback Plan

If critical issues found in production:
```bash
# Revert to previous commit
git revert HEAD
pnpm build
pm2 restart script-workspace
pm2 stop script-collab  # if collab is causing issues
```
