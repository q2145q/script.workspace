# Script Workspace

AI-powered screenwriting workspace. Write, manage, and collaborate on screenplays with intelligent assistance.

## Features

- **Screenplay Editor** — TipTap-based editor with 6 custom nodes (scene heading, action, character, dialogue, parenthetical, transition), keyboard shortcuts, and auto-formatting
- **Autocomplete** — Smart suggestions for scene headings (INT./EXT., locations, time of day) and character names, supporting Russian and English
- **AI Rewrite** — Select text, press Cmd+K, describe changes — get a diff preview with Apply/Reject (OpenAI & Anthropic BYOK)
- **AI Chat** — Context-aware chat with streaming responses, project bible, and pinned context included automatically
- **Comments** — Threaded comments anchored to text positions with resolve/unresolve
- **Project Bible** — Dedicated reference document always included in AI context
- **Context Pins** — Pin selected text or custom notes to AI context, drag-and-drop reorder
- **Export** — PDF and DOCX with configurable title page, scene numbering, page numbering, paper size, and watermark
- **Drafts / Versions** — Snapshot current document as a draft, browse version history, restore any draft
- **Series / Episodes** — TV Series projects support multiple episodes, each with its own document and drafts
- **Outline / Corkboard** — Visual scene cards with drag-and-drop reordering
- **Entities** — Manage characters (with traits), locations, and glossary terms; auto-detection from screenplay content
- **Scene Navigator** — Click-to-scroll scene list in the sidebar
- **Multi-language** — 10 languages supported for project settings and editor hints
- **Theme** — Light and dark mode toggle

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | pnpm + Turborepo |
| Frontend | Next.js 15, React 19, TailwindCSS 4 |
| Editor | TipTap (ProseMirror) with custom extensions |
| API | tRPC v11 with Zod validation |
| Database | PostgreSQL (Neon) + Prisma ORM |
| Auth | Better Auth (email/password) |
| AI | OpenAI + Anthropic (BYOK, SSE streaming) |
| UI | Radix UI, Framer Motion, Lucide icons |
| Export | pdfkit (PDF), docx (DOCX) |

## Project Structure

```
apps/
  web/                    # Next.js frontend

packages/
  ai/                     # AI provider abstraction, chat streaming, context builder
  api/                    # tRPC routers (project, document, comment, ai, chat, draft, episode, entity, etc.)
  db/                     # Prisma schema and client
  editor/                 # TipTap editor, screenplay extensions, autocomplete
  types/                  # Shared Zod schemas and TypeScript types
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL database (e.g. [Neon](https://neon.tech))

### Setup

```bash
# Install dependencies
pnpm install

# Configure environment
cp apps/web/.env.example apps/web/.env
cp packages/db/.env.example packages/db/.env
# Edit .env files with your DATABASE_URL and secrets

# Push schema to database
cd packages/db && npx prisma db push

# Run development server
pnpm dev
```

The app will be available at `http://localhost:3001`.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Secret for session encryption |
| `AI_ENCRYPTION_SECRET` | Secret for encrypting stored API keys (AES-256-GCM) |

## Scripts

```bash
pnpm dev          # Start development server (Turbopack)
pnpm build        # Production build
pnpm type-check   # TypeScript type checking
pnpm lint         # ESLint
```

## Database Models

**Core:** User, Project, Document, ProjectMember

**Collaboration:** CommentThread, CommentMessage

**AI:** AIProvider, Suggestion, ChatMessage, ProjectBible, ContextPin, RAGChunk

**Versioning:** Draft, Episode

**Entities:** Character, Location, Term

## License

Private.
