# Tasks: Bingo Card Creation UX

**Input**: Design documents from `/specs/001-card-creation-ux/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contracts.md, quickstart.md

**Tests**: Not requested — no test tasks included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **App routes**: `app/` directory (Next.js App Router)
- **Components**: `components/` at repository root
- **Utilities & types**: `lib/` at repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the Next.js project, install dependencies, configure global styles

- [x] T001 Initialize Next.js 15 project with TypeScript (strict), Tailwind CSS 4, ESLint, and App Router at the repository root using `npx create-next-app@latest`
- [x] T002 Install feature dependencies `react-markdown`, `remark-gfm`, and `@tailwindcss/typography` via `npm install react-markdown remark-gfm @tailwindcss/typography`
- [x] T003 [P] Add custom `bingo-glow` keyframes animation and Tailwind `@theme` token (`--animate-bingo-glow`) to app/globals.css per research.md Topic 3

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Types, pure utilities, state provider, and root layout wiring that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Define all TypeScript interfaces (`Cell`, `AppState`, `AppAction`) and constants (`GOALS_REQUIRED = 24`, `MAX_GOAL_LENGTH = 100`, `MAX_NOTES_LENGTH = 500`) in lib/types.ts per data-model.md and contracts/ui-contracts.md
- [x] T005 [P] Implement Fisher-Yates shuffle utility (`shuffle<T>(array: T[]): T[]`) that returns a new array without mutating input in lib/shuffle.ts
- [x] T006 [P] Implement bingo detection (`detectBingos`) and new-bingo diff (`findNewBingos`) pure functions with the `BINGO_LINES` constant in lib/bingo.ts per research.md Topic 2
- [x] T007 Implement `AppProvider` component with full `appReducer` (all action types: `ADD_GOAL`, `REMOVE_GOAL`, `GENERATE_CARD`, `TOGGLE_COMPLETION`, `UPDATE_NOTES`, `UPDATE_GOAL_TITLE`, `RESET`) and `useApp` hook in components/AppProvider.tsx per data-model.md actions table and research.md Topic 5
- [x] T008 Wire `AppProvider` into the root layout wrapping `{children}` in app/layout.tsx — configure HTML lang, metadata, font, and body with Tailwind dark/muted styling per research.md Topic 5

**Checkpoint**: Foundation ready — types defined, utilities pure-testable, state management wired. User story implementation can now begin.

---

## Phase 3: User Story 1 — Enter Goals and Generate a Bingo Card (Priority: P1) 🎯 MVP

**Goal**: User enters 24 goals one at a time with a progressive 5×5 grid preview, sees a live counter, and creates a randomized bingo card.

**Independent Test**: Type and add 24 goals one at a time, watch each goal fill the next cell in the preview grid, confirm the "Create Card" button enables at exactly 24, press it, and verify the app transitions to `/card` with a 5×5 grid containing all goals plus a free center space.

### Implementation for User Story 1

- [x] T009 [P] [US1] Implement `GoalInput` component with text field, Add button, Enter key submit, 100-char max length, trim + empty rejection, and disabled state in components/GoalInput.tsx per contracts/ui-contracts.md GoalInput contract
- [x] T010 [P] [US1] Implement `PreviewGrid` component displaying a 5×5 grid that progressively fills cells as goals are added, with free space center cell, placeholder state for empty cells, and hover-reveal remove button on filled cells in components/PreviewGrid.tsx per spec FR-002, FR-002a
- [x] T011 [P] [US1] Implement `GoalCounter` component displaying "X / 24" progress in components/GoalCounter.tsx per contracts/ui-contracts.md GoalCounter contract
- [x] T012 [US1] Build the goal entry page assembling `GoalInput`, `PreviewGrid`, `GoalCounter`, and a "Create Card" button (disabled until 24 goals); dispatch `ADD_GOAL`, `REMOVE_GOAL`, `GENERATE_CARD` and navigate to `/card` on creation in app/page.tsx per spec FR-001 through FR-006a
- [x] T013 [US1] Create card view page skeleton with route guard (redirect to `/` if `!cardGenerated`) in app/card/page.tsx — full card rendering deferred to US2

**Checkpoint**: User Story 1 functional — goal entry works end-to-end, card view route exists with guard. The app transitions to `/card` after generating.

---

## Phase 4: User Story 2 — View and Interact with the Bingo Card (Priority: P2)

**Goal**: After creation, display a sleek, minimal, responsive 5×5 bingo card. No back-navigation — goal editing is handled inline (US5).

**Independent Test**: Create a card, verify the 5×5 grid renders with proper styling on desktop (1440px) and mobile (375px) viewports. Free space in center. No "Edit Goals" button present.

### Implementation for User Story 2

- [x] T014 [P] [US2] Implement `BingoCell` component displaying goal text with truncation, free space visual distinction, and responsive sizing in components/BingoCell.tsx per contracts/ui-contracts.md BingoCell contract (display only — completion toggle added in US4, inline editing added in US5)
- [x] T015 [US2] Implement `BingoCard` component rendering a responsive 5×5 CSS Grid of `BingoCell` components (375px–1440px) in components/BingoCard.tsx per contracts/ui-contracts.md BingoCard contract
- [x] T016 [US2] Build the full card view page with `BingoCard`, responsive page layout with dark/muted styling, and hint subtitle for inline editing in app/card/page.tsx per spec FR-003a, FR-007, FR-008

**Checkpoint**: User Story 2 functional — card view is styled, responsive, with no back-navigation. Grid renders all 25 cells with free center space.

---

## Phase 5: User Story 3 — View Notes and Track Subgoals Within a Cell (Priority: P3)

**Goal**: Click a cell body to open a centered modal with read-only Markdown view, an Edit button for a Markdown editor with live preview, Done button to save, and 500-char limit.

**Independent Test**: Generate a card, click a cell, see the read view, press Edit, type a Markdown checklist (`- [ ] item`), see it rendered in live preview, press Done, verify notes persist on reopen within session.

### Implementation for User Story 3

- [x] T017 [P] [US3] Implement `MarkdownPreview` component rendering CommonMark + GFM task lists via `react-markdown` and `remark-gfm`, with empty-state placeholder, interactive checkbox toggling (FR-010b), and bullet-free task list rendering (FR-010c) in components/MarkdownPreview.tsx per contracts/ui-contracts.md MarkdownPreview contract and research.md Topic 1
- [x] T018 [P] [US3] Implement `MarkdownEditor` component with plain textarea, 500-char `maxLength`, character counter with near-limit warning in components/MarkdownEditor.tsx per contracts/ui-contracts.md MarkdownEditor contract
- [x] T019 [US3] Implement `CellModal` component using native `<dialog>` element with `showModal()`, always-edit mode with MarkdownEditor + live MarkdownPreview + Save button, goal title header, save-on-dismiss (backdrop/Escape/close button) in components/CellModal.tsx per spec FR-009 through FR-009d and research.md Topic 4
- [x] T020 [US3] Integrate `CellModal` into card view page — add cell body click handler to `BingoCard`/`BingoCell`, manage selected cell state, dispatch `UPDATE_NOTES` on save in app/card/page.tsx per contracts/ui-contracts.md route contract for `/card` and spec FR-009 through FR-013

**Checkpoint**: User Story 3 functional — cell click opens modal with editor + preview, Markdown renders with interactive checkboxes, Save/dismiss persists notes in session.

---

## Phase 6: User Story 4 — Mark Goals as Completed and Achieve Bingos (Priority: P4)

**Goal**: Toggle cell completion via checkbox/icon, visually distinguish completed cells, detect bingos, animate only newly completed lines, display bingo counter.

**Independent Test**: Generate a card, mark 5 cells in a row as complete using the checkbox. Verify the bingo is recognized with a highlight/glow animation on those cells. Mark another line — only the new line animates. Un-toggle a cell in the first bingo — counter decrements.

### Implementation for User Story 4

- [x] T021 [US4] Add completion toggle checkbox/icon (separate click target from cell body), completed state visual styling, and `animate-bingo-glow` class (applied when `isNewBingo` is true) to `BingoCell` in components/BingoCell.tsx per contracts/ui-contracts.md BingoCell contract and spec FR-015, FR-015a, FR-016b
- [x] T022 [P] [US4] Implement `BingoCounter` component displaying "X / 12 Bingos" in components/BingoCounter.tsx per contracts/ui-contracts.md BingoCounter contract and spec FR-016c
- [x] T023 [US4] Integrate completion toggle, bingo detection, `newBingos` diff-based animation, and `BingoCounter` into card view page — dispatch `TOGGLE_COMPLETION`, pass `completedBingos` and `newBingos` to `BingoCard`, pass `isInBingo` and `isNewBingo` props to each `BingoCell` in app/card/page.tsx per data-model.md TOGGLE_COMPLETION action and research.md animation trigger section

**Checkpoint**: User Story 4 functional — completion toggle works, bingos detected, animation fires only for new bingos, counter shows X/12, revocation works.

---

## Phase 7: User Story 5 — Edit Goals Inline on the Generated Card (Priority: P5)

**Goal**: Allow the user to edit any goal's text directly on the card view via double-click inline editing, without navigating back to the creation screen.

**Independent Test**: Create a card, double-click a goal cell, change the text and press Enter, verify the change persists. Press Escape on another cell to verify cancel. Confirm notes and completion state are preserved after editing.

### Implementation for User Story 5

- [x] T026 [US5] Add inline editing to `BingoCell` — double-click triggers edit mode, Enter/blur saves, Escape cancels, 100-char max enforced, free space not editable, `onUpdateGoalTitle` callback prop in components/BingoCell.tsx per spec FR-017 through FR-017d
- [x] T027 [US5] Add `UPDATE_GOAL_TITLE` action type to `AppAction` union in lib/types.ts and handle in `appReducer` (preserves notes and completion state, trims input, enforces MAX_GOAL_LENGTH, rejects free space edits) in components/AppProvider.tsx per spec FR-017b, FR-017c
- [x] T028 [US5] Wire inline editing into card view page — implement `handleUpdateGoalTitle` dispatching `UPDATE_GOAL_TITLE`, pass `onUpdateGoalTitle` prop through `BingoCard` to `BingoCell`, add hint subtitle "Double-click a cell to edit its goal" in app/card/page.tsx per spec FR-017, US5

**Checkpoint**: User Story 5 functional — double-click opens inline edit, Enter saves, Escape cancels, 100-char limit enforced, free space not editable, notes and completion preserved.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and responsive refinements

- [x] T024 [P] Verify responsive layout across all views at 375px, 768px, and 1440px breakpoints — adjust Tailwind classes as needed in app/page.tsx, app/card/page.tsx, and all components/
- [x] T025 Run quickstart.md end-to-end validation: setup project, navigate both routes, test all 5 user stories, confirm edge cases (trim whitespace, empty input, 100-char limit, 24-goal cap, 500-char notes limit, rapid toggle, bingo revocation, inline edit preservation, browser refresh loses state)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational — can start immediately after Phase 2
- **US2 (Phase 4)**: Depends on US1 — card view requires card generation
- **US3 (Phase 5)**: Depends on US2 — modal requires card view with cells
- **US4 (Phase 6)**: Depends on US2 — completion toggle requires BingoCell
- **US5 (Phase 7)**: Depends on US2 — inline editing requires BingoCell on card view
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

```text
Phase 1: Setup
    │
Phase 2: Foundational (BLOCKS everything)
    │
Phase 3: US1 (Goal Entry + Progressive Grid + Generation) ── 🎯 MVP
    │
Phase 4: US2 (Card View + Styling)
    ├──────────────────┐───────────────────┐
Phase 5: US3 (Modal)   Phase 6: US4    Phase 7: US5
    │                   │               (Inline Edit)
    └──────────────────┘               │
              │                           │
              └─────────────────────────┘
                          │
Phase 8: Polish
```

### Within Each User Story

- Components marked [P] can be built in parallel
- Page-level integration tasks depend on their component tasks
- Core component implementation before page integration

### Parallel Opportunities

- **Phase 2**: T005 and T006 can run in parallel (both pure utility files, depend only on T004)
- **Phase 3**: T009, T010, T011 can all run in parallel (independent components)
- **Phase 5**: T017 and T018 can run in parallel (independent components)
- **Phase 5, 6 & 7**: US3, US4, and US5 can run in parallel after US2 (different concerns — modal vs. completion vs. inline edit)
- **Phase 6**: T022 can run in parallel with T021 (different files)

---

## Parallel Examples

### Phase 2: Foundational (after T004)

```text
Parallel batch:
  T005: Fisher-Yates shuffle in lib/shuffle.ts
  T006: Bingo detection in lib/bingo.ts
Then:
  T007: AppProvider with full reducer (depends on types from T004, shuffle from T005, bingo from T006)
  T008: Wire into layout (depends on T007)
```

### Phase 3: User Story 1 Components

```text
Parallel batch:
  T009: GoalInput in components/GoalInput.tsx
  T010: PreviewGrid in components/PreviewGrid.tsx
  T011: GoalCounter in components/GoalCounter.tsx
Then:
  T012: Assemble goal entry page in app/page.tsx (depends on T009, T010, T011)
  T013: Card view skeleton in app/card/page.tsx
```

### Phase 5, 6 & 7: US3 + US4 + US5 in Parallel

```text
Developer A (US3):               Developer B (US4):           Developer C (US5):
  T017: MarkdownPreview            T021: BingoCell completion    T026: BingoCell inline edit
  T018: MarkdownEditor             T022: BingoCounter            T027: UPDATE_GOAL_TITLE action
  T019: CellModal                  T023: Card view integration   T028: Card view integration
  T020: Card view integration
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Enter 24 goals, generate card, verify 5×5 grid
5. Deploy/demo if ready — this is the core product

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Test goal entry + progressive grid + generation → **MVP!**
3. Add US2 → Test responsive card view → Styled product
4. Add US3 → Test modal + Markdown → Subgoal tracking
5. Add US4 → Test completion + bingos → Full tracking
6. Add US5 → Test inline editing → Full feature
7. Polish → Responsive QA + edge case validation
8. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Tests not included — spec does not request them
- Commit after each task or logical group
- Stop at any checkpoint to validate the story independently
- The reducer in T007 implements all action types upfront to avoid editing the same file across stories; `UPDATE_GOAL_TITLE` was added in Revision 2
- `newBingos` state tracks only freshly completed bingo lines for animation (see research.md animation trigger section)
- `GoalList.tsx` has been removed — superseded by `PreviewGrid.tsx` as of spec Revision 2
