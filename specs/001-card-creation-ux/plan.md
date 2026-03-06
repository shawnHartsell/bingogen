# Implementation Plan: Bingo Card Creation UX

**Branch**: `001-card-creation-ux` | **Date**: 2026-03-06 | **Spec**: [spec.md](spec.md) (Revision 2)
**Input**: Feature specification from `/specs/001-card-creation-ux/spec.md`

## Summary

Build the core UX for a bingo card goal tracker as a Next.js App Router application. Users enter 24 goals one at a time with a progressive 5×5 grid preview, create a randomized bingo card (with free center space), view/edit Markdown subgoal notes per cell via a modal, toggle goal completion with bingo detection, and edit goals inline on the generated card. The creation view is a one-time flow — once the card is created, all interaction happens on the card view. Client-side state only — no persistence. Mobile-first responsive design with Tailwind CSS.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) / Node.js 20+
**Primary Dependencies**: Next.js 16 (App Router), React 19, Tailwind CSS 4, react-markdown (for Markdown rendering), @tailwindcss/typography (for prose styling)
**Storage**: N/A — all state held in React client memory (no persistence this feature)
**Testing**: Vitest + React Testing Library (add only when spec requires)
**Target Platform**: Web — responsive from 375px (mobile) to 1440px (desktop)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Instant UI interactions (<100ms); bingo detection <1s per spec SC-006
**Constraints**: No server persistence; single-user, single-session; no accounts
**Scale/Scope**: 1 user, 1 card at a time, 25 cells, up to 12 bingos

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                      | Status  | Evidence                                                                                                               |
| ------------------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------- |
| I. Spec-First (NON-NEGOTIABLE) | ✅ PASS | spec.md exists with 5 user stories (Revision 2), Given/When/Then scenarios, and clarifications resolved                |
| II. Next.js Conventions        | ✅ PASS | Plan uses App Router exclusively, `"use client"` only for interactive components, Tailwind CSS for styling             |
| III. Simplicity & Learning     | ✅ PASS | 3 external deps (`react-markdown`, `remark-gfm`, `@tailwindcss/typography`); flat structure; no premature abstractions |

**Gate result**: PASS — proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/001-card-creation-ux/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
app/
├── layout.tsx           # Root layout (font, metadata, global styles)
├── page.tsx             # Goal entry view (home/create)
├── card/
│   └── page.tsx         # Card view (after generation)
├── globals.css          # Tailwind directives + custom CSS
└── favicon.ico

components/
├── GoalInput.tsx        # Text field + Add button + validation
├── PreviewGrid.tsx      # Progressive 5×5 grid preview during goal entry
├── GoalCounter.tsx      # "12 / 24" counter display
├── BingoCard.tsx        # 5×5 grid layout
├── BingoCell.tsx        # Individual cell (goal text, checkbox, click, inline edit)
├── CellModal.tsx        # Centered modal for notes (read/edit modes)
├── MarkdownPreview.tsx  # Markdown renderer (react-markdown wrapper)
├── MarkdownEditor.tsx   # Textarea with character count
└── BingoCounter.tsx     # "3 / 12 Bingos" display

lib/
├── types.ts             # TypeScript interfaces (Goal, Cell, BingoCard)
├── shuffle.ts           # Fisher-Yates shuffle for card generation
└── bingo.ts             # Bingo detection logic (rows/cols/diagonals)
```

**Structure Decision**: Next.js App Router with `app/` for routes and
co-located `components/` and `lib/` directories at the root. This is
the standard flat structure recommended by Next.js docs. Two routes:
`/` for goal entry (one-time creation flow with progressive grid
preview) and `/card` for the bingo card view (primary interaction
surface with inline editing, notes, and completion tracking). All
components are client components since the entire feature is
interactive state management.

## Constitution Re-Check (Post-Design)

_Re-evaluated after Phase 1 design artifacts completed._

| Principle                      | Status  | Post-Design Evidence                                                                                                                                                                                       |
| ------------------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Spec-First (NON-NEGOTIABLE) | ✅ PASS | All design artifacts trace to spec FRs (Revision 2). Data model references spec entities. UI contracts cite FR numbers. US5 inline editing covered.                                                        |
| II. Next.js Conventions        | ✅ PASS | App Router `app/` directory, two routes, `"use client"` for interactive components, Tailwind CSS, `@/*` alias.                                                                                             |
| III. Simplicity & Learning     | ✅ PASS | 3 external deps only (`react-markdown`, `remark-gfm`, `@tailwindcss/typography`). Native `<dialog>`, React Context + `useReducer`, CSS `@keyframes`. All alternatives documented with rejection rationale. |

**Gate result**: PASS — no violations. Complexity Tracking empty.

## Complexity Tracking

> No constitution violations — this section is intentionally empty.
