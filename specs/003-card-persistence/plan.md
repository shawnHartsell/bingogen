# Implementation Plan: Card Persistence & Navigation

**Branch**: `003-card-persistence` | **Date**: 2026-03-21 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-card-persistence/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Add persistence and navigation for bingo cards. Users can save cards with a title, auto-persist updates (cell completion, notes, goal titles, card title), view any saved card via `/cards?id=<identifier>`, browse all saved cards in a sidebar sorted by most recently created, and delete cards with confirmation. Data is stored as JSON documents in a NoSQL database. The full card state is saved on each update (whole-document replacement).

## Technical Context

**Language/Version**: TypeScript 5, Node.js 20+  
**Primary Dependencies**: Next.js 16 (App Router), React 19, Tailwind CSS 4  
**Storage**: MongoDB (local instance for development) — JSON documents via native `mongodb` driver. Hosted infrastructure (Atlas, containers, Terraform) deferred to a later feature.  
**Testing**: Not yet added (constitution says add only when spec requires tested behavior)  
**Target Platform**: Web application (browser), local development only for this feature. Deployment infrastructure deferred.  
**Project Type**: Web application (Next.js App Router)  
**Performance Goals**: Card saves persist within 1 second of user action (SC-002); sidebar navigation <2 seconds (SC-003)  
**Constraints**: Small app, low volume (<100 cards per user). Whole-document save strategy preferred for simplicity  
**Scale/Scope**: Single-user, low card count. No multi-user auth. No cross-device sync required

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### I. Spec-First Development (NON-NEGOTIABLE) — PASS

- Feature spec exists at `specs/003-card-persistence/spec.md` with user stories, acceptance scenarios in Given/When/Then, and clarifications resolved.
- This plan is being produced from the approved spec before coding starts.

### II. Next.js Conventions — PASS (with notes)

- The `/cards` route will use the App Router (`app/cards/page.tsx`).
- Data fetching for loading a saved card should use Server Components or Route Handlers where possible.
- NoSQL database access will use Next.js Server Actions or Route Handlers (not client-side direct DB access).
- NOTE: The spec's original assumption of "client-side storage" is superseded by the user's decision to use a NoSQL database. This is an upgrade in approach, consistent with learning Next.js server-side patterns.

### III. Simplicity & Learning — PASS (with justification)

- Adding a database is now explicitly required by the spec (persistence is the core feature).
- Whole-document save keeps the persistence layer simple — no partial update logic.
- The database choice should favor the simplest option with good documentation (per constitution).
- No ORM or repository abstraction layer — direct SDK usage for simplicity.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
app/
├── page.tsx                # Goal entry (existing)
├── layout.tsx              # Root layout (existing)
├── globals.css             # Global styles (existing)
├── card/
│   └── page.tsx            # Legacy card view (existing, to be superseded)
└── cards/
    └── page.tsx            # New: card view with sidebar, query string routing

components/
├── AppProvider.tsx          # State management (existing, to be extended)
├── BingoCard.tsx            # Card grid (existing)
├── BingoCell.tsx            # Cell component (existing)
├── BingoCounter.tsx         # Bingo line counter (existing)
├── CellModal.tsx            # Cell edit modal (existing)
├── GoalCounter.tsx          # Goal progress (existing)
├── GoalInput.tsx            # Goal entry input (existing)
├── CardSidebar.tsx          # New: sidebar card list
├── CardTitleInput.tsx       # New: editable card title
├── DeleteConfirmDialog.tsx  # New: delete confirmation modal
├── MarkdownEditor.tsx       # Markdown editor (existing)
├── MarkdownPreview.tsx      # Markdown preview (existing)
└── PreviewGrid.tsx          # Preview grid (existing)

lib/
├── bingo.ts                # Bingo detection (existing)
├── shuffle.ts              # Shuffle utility (existing)
├── types.ts                # Type definitions (existing, to be extended)
├── db.ts                   # New: database client/connection
└── cards.ts                # New: card CRUD operations (server-side)
```

**Structure Decision**: Follows existing flat structure per constitution (Simplicity principle). New files added only where needed: one new route (`app/cards/`), three new components, and two new lib modules for database access. No abstraction layers or deep nesting.

## Complexity Tracking

> No constitution violations identified. No justifications needed.

## Post-Design Constitution Re-Check

_Re-evaluated after Phase 1 design artifacts are complete._

### I. Spec-First Development — PASS

- Spec, clarifications, research, data model, and contracts all produced before any code.

### II. Next.js Conventions — PASS

- Server Components for data fetching (`app/cards/page.tsx` loads card data server-side).
- Server Actions for mutations (`lib/cards.ts` — createCard, updateCard, deleteCard).
- App Router route: `app/cards/page.tsx`. No Pages Router usage.
- MongoDB driver used server-side only — no database credentials or SDK exposed to browser.
- `"use client"` used only for interactive components (sidebar, title input, card grid).

### III. Simplicity & Learning — PASS

- One new dependency added: `mongodb` native driver. No ORM (Mongoose rejected for simplicity).
- Flat file structure maintained: 3 new components, 2 new lib modules, 1 new route.
- Whole-document replacement avoids partial-update complexity.
- No abstraction layers, no repository pattern, no middleware.
