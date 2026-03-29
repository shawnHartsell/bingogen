# Tasks: Card Persistence & Navigation

**Input**: Design documents from `/specs/003-card-persistence/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: No tests requested in the feature specification. Test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install MongoDB, add the `mongodb` dependency, create the database connection module, and extend types for persistence.

- [x] T001 Install local MongoDB via Homebrew and verify it is running on localhost:27017 per quickstart.md
- [x] T002 Install the `mongodb` npm package via `npm install mongodb`
- [x] T003 Create `.env.local` with `MONGODB_URI=mongodb://localhost:27017/bingogen`
- [x] T004 Create MongoDB client singleton module in lib/db.ts (cached MongoClient pattern per research.md)
- [x] T005 Add `BingoCardDocument`, `CardListItem`, and persistence-related fields (`cardId`, `cardTitle`) to `AppState` in lib/types.ts per data-model.md
- [x] T006 Add new actions `SET_CARD_TITLE` and `LOAD_CARD` to the `AppAction` union in lib/types.ts per data-model.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Server actions for all CRUD operations. These are shared by multiple user stories and must exist before any story can function.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T007 Implement `createCard` server action in lib/cards.ts per contracts/ui-contracts.md (inserts document with createdAt/updatedAt, returns `{ id }`)
- [x] T008 [P] Implement `getCard` server action in lib/cards.ts per contracts/ui-contracts.md (fetches single card by ObjectId, returns `BingoCardDocument | null`)
- [x] T009 [P] Implement `listCards` server action in lib/cards.ts per contracts/ui-contracts.md (returns `CardListItem[]` sorted by createdAt descending, using projection `{ _id: 1, title: 1, createdAt: 1 }`)
- [x] T010 [P] Implement `updateCard` server action in lib/cards.ts per contracts/ui-contracts.md (whole-document replacement via replaceOne, sets updatedAt)
- [x] T011 [P] Implement `deleteCard` server action in lib/cards.ts per contracts/ui-contracts.md (deletes document by ObjectId)

**Checkpoint**: All five CRUD server actions exist and can be called from server components and client code. Foundation ready.

---

## Phase 3: User Story 1 - Save a Newly Created Bingo Card (Priority: P1) 🎯 MVP

**Goal**: When a user generates a bingo card (after entering 24 goals and a title), the card is saved to MongoDB and the browser navigates to `/cards?id=<new-id>`.

**Independent Test**: Create a card with a title, note the URL, open it in a new tab — the card should load with all goals in place.

### Implementation for User Story 1

- [x] T012 [US1] Create `CardTitleInput` component in components/CardTitleInput.tsx per contracts/ui-contracts.md (inline-editable heading, validates non-empty, calls onChange on blur/Enter)
- [x] T013 [US1] Add `SET_CARD_TITLE` reducer case in components/AppProvider.tsx to update `cardTitle` in state
- [x] T014 [US1] Add `CardTitleInput` to the goal entry page (app/page.tsx) so users can set a title before generating the card
- [x] T015 [US1] Update `GENERATE_CARD` reducer case in components/AppProvider.tsx to require non-empty `cardTitle` before generating (FR-003)
- [x] T016 [US1] Wire up card creation flow: after `GENERATE_CARD` dispatch, call `createCard` server action with title + cells + completedBingos, then navigate to `/cards?id=<returned-id>` using `router.push` in app/page.tsx
- [x] T017 [US1] Add error handling for save failures in the card creation flow — display error message without losing in-memory card data (FR-013)

**Checkpoint**: User Story 1 is complete. A user can enter goals, set a title, generate a card, and be navigated to `/cards?id=<id>`. The card is persisted in MongoDB.

---

## Phase 4: User Story 3 - View a Saved Bingo Card by ID (Priority: P1)

**Goal**: The `/cards` page loads a card from MongoDB by the `id` query parameter and renders it. Handles missing/invalid IDs and default card selection.

**Independent Test**: Navigate to `/cards?id=<valid-id>` — see the full card. Navigate to `/cards?id=bad` — see "card not found". Navigate to `/cards` — see the most recent card.

> **Note**: US3 is implemented before US2 because you need a page to view a saved card before you can persist updates on it.

### Implementation for User Story 3

- [x] T018 [US3] Create the `/cards` route as a Server Component in app/cards/page.tsx — read `searchParams.id`, call `getCard(id)` and `listCards()` server-side, pass data as props to client components
- [x] T019 [US3] Implement default card selection logic in app/cards/page.tsx: if no `id` param, call `listCards()` and select the first (most recently created) card (FR-007)
- [x] T020 [US3] Implement "card not found" state in app/cards/page.tsx: if `getCard` returns null, render a user-friendly message with a link to create a new card (FR-008)
- [x] T021 [US3] Implement empty state in app/cards/page.tsx: if `listCards()` returns empty, render a message encouraging the user to create a card
- [x] T022 [US3] Create a client wrapper component in app/cards/CardViewClient.tsx that initializes `AppProvider` state from the loaded `BingoCardDocument` via the `LOAD_CARD` action
- [x] T023 [US3] Add `LOAD_CARD` reducer case in components/AppProvider.tsx to hydrate state from a `BingoCardDocument` (sets cells, completedBingos, cardId, cardTitle, cardGenerated=true)
- [x] T024 [US3] Render `BingoCard`, `BingoCounter`, `CellModal`, and `CardTitleInput` in the `/cards` page main content area, reusing existing components

**Checkpoint**: User Story 3 is complete. Users can navigate to `/cards?id=<id>` and see their saved card. Invalid IDs and no-cards states are handled gracefully.

---

## Phase 5: User Story 2 - Persist Card Updates (Priority: P1)

**Goal**: All interactions on a saved card (toggle completion, edit notes, edit goal title, edit card title) are automatically persisted to MongoDB.

**Independent Test**: Toggle a cell, add notes, edit the title, refresh the page — all changes are still there.

### Implementation for User Story 2

- [x] T025 [US2] Implement auto-save logic in app/cards/CardViewClient.tsx: use a useEffect hook watching relevant state fields (cells, cardTitle), debounced by 500ms, to call `updateCard` server action with the full current state after any state-changing dispatch (`TOGGLE_COMPLETION`, `UPDATE_NOTES`, `UPDATE_GOAL_TITLE`, `SET_CARD_TITLE`)
- [x] T026 [US2] Ensure `CardTitleInput` on the `/cards` page dispatches `SET_CARD_TITLE` and triggers auto-save, and verify the sidebar reflects the new title immediately
- [x] T027 [US2] Add error handling for update failures — display a non-blocking error message without losing in-memory state (FR-013)
- [x] T028 [US2] Handle rapid changes: debounce or serialize save calls so multiple quick toggles don't result in lost writes or race conditions

**Checkpoint**: User Story 2 is complete. All card interactions auto-persist. Users can close the browser and return to find all changes intact.

---

## Phase 6: User Story 4 - Browse Saved Bingo Cards via Sidebar (Priority: P2)

**Goal**: A sidebar on the `/cards` page shows all saved cards by title (newest first). Clicking a card navigates to it. Cards can be deleted with confirmation.

**Independent Test**: Create multiple cards, verify they appear in the sidebar by title, click between them, delete one and verify it's gone.

### Implementation for User Story 4

- [x] T029 [US4] Create `CardSidebar` component in components/CardSidebar.tsx per contracts/ui-contracts.md (renders card list, highlights active card, inline delete button per card)
- [x] T030 [US4] Create `DeleteConfirmDialog` component in components/DeleteConfirmDialog.tsx per contracts/ui-contracts.md (modal with confirm/cancel, closes on Escape/backdrop)
- [x] T031 [US4] Integrate `CardSidebar` into the `/cards` page layout in app/cards/page.tsx — sidebar on the left, card content on the right
- [x] T032 [US4] Wire sidebar card selection: clicking a card title updates the URL to `/cards?id=<id>` via `router.push` and loads the selected card
- [x] T033 [US4] Wire sidebar delete: clicking delete opens `DeleteConfirmDialog`, on confirm calls `deleteCard` server action, removes card from sidebar list, and navigates to next card or empty state (FR-014, FR-015)
- [x] T034 [US4] Style the sidebar layout to be responsive — collapsible or non-intrusive on mobile viewports

**Checkpoint**: User Story 4 is complete. Users can browse, switch between, and delete saved cards from the sidebar.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, edge cases, and validation across all stories.

- [x] T035 [P] Update the goal entry page (app/page.tsx) to reset `AppProvider` state cleanly when starting a new card (ensure `RESET` action clears persistence fields)
- [x] T036 [P] Verify edge case: storage/DB errors display a user-friendly message and don't crash the app
- [x] T037 [P] Verify edge case: malformed `id` query parameter shows "card not found" instead of a crash
- [x] T038 Run quickstart.md smoke test end-to-end: create card → view by URL → toggle cells → refresh → create second card → sidebar switch → delete card

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (needs db.ts, types, mongodb package)
- **US1 (Phase 3)**: Depends on Phase 2 (needs createCard server action)
- **US3 (Phase 4)**: Depends on Phase 2 (needs getCard, listCards) + Phase 3 (needs saved card to view)
- **US2 (Phase 5)**: Depends on Phase 4 (needs /cards page to exist for auto-save wiring)
- **US4 (Phase 6)**: Depends on Phase 4 (needs /cards page layout) + Phase 2 (needs deleteCard, listCards)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (Save Card)**: Foundation only — can start after Phase 2
- **US3 (View Card)**: Needs US1 complete (a saved card must exist to view it)
- **US2 (Persist Updates)**: Needs US3 complete (the /cards page must exist to wire auto-save)
- **US4 (Sidebar)**: Needs US3 complete (the /cards page layout must exist for sidebar integration)

### Within Each User Story

- Types/models before services
- Server actions before client wiring
- Core functionality before error handling
- Story complete before moving to next priority

### Parallel Opportunities

- T008, T009, T010, T011 can all run in parallel (independent server actions in the same file)
- T012 (CardTitleInput) can run in parallel with T013 (reducer case) — different files
- T029 (CardSidebar) and T030 (DeleteConfirmDialog) can run in parallel — different files
- T035, T036, T037 in Polish phase can all run in parallel

---

## Parallel Example: Phase 2 (Foundational)

```text
# After T007 (createCard) is done, launch remaining server actions in parallel:
Task T008: "Implement getCard server action in lib/cards.ts"
Task T009: "Implement listCards server action in lib/cards.ts"
Task T010: "Implement updateCard server action in lib/cards.ts"
Task T011: "Implement deleteCard server action in lib/cards.ts"
```

## Parallel Example: User Story 4

```text
# Launch both new components in parallel:
Task T029: "Create CardSidebar component in components/CardSidebar.tsx"
Task T030: "Create DeleteConfirmDialog component in components/DeleteConfirmDialog.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 + 3 Only)

1. Complete Phase 1: Setup (MongoDB, types, db.ts)
2. Complete Phase 2: Foundational (all 5 server actions)
3. Complete Phase 3: User Story 1 (save card on creation, navigate to /cards?id=X)
4. Complete Phase 4: User Story 3 (view saved card by URL)
5. **STOP and VALIDATE**: Create a card, close browser, reopen URL — card is intact
6. This is a deployable MVP

### Incremental Delivery

1. Setup + Foundational → Infrastructure ready
2. Add US1 → Cards are saved on creation
3. Add US3 → Cards viewable by URL → **MVP complete**
4. Add US2 → Changes auto-persist → Full interactive experience
5. Add US4 → Sidebar browsing + delete → Multi-card management
6. Polish → Edge cases, cleanup, smoke test

---

## Notes

- [P] tasks = different files, no dependencies on other in-progress tasks
- [Story] label maps task to specific user story for traceability
- US3 is implemented before US2 because you need the /cards page before you can wire auto-save on it
- No test tasks included (not requested in the feature specification)
- All server actions are in a single file (lib/cards.ts) but can be implemented independently
- Commit after each task or logical group
