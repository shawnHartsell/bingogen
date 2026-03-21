# Feature Specification: Card Persistence & Navigation

**Feature Branch**: `003-card-persistence`  
**Created**: 2026-03-21  
**Status**: Draft  
**Input**: User description: "Once a bingo card is created we need to be able to save it. We also need to be able to save updates like adding notes and checking boxes. This means we'll also need to have a page to view an individual bingo card by id. We might also want to consider a view that shows a list of bingo cards. Or maybe we could add a list as a side bar in the view bingo card view."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Save a Newly Created Bingo Card (Priority: P1)

A user finishes entering their 24 goals, gives the card a title, and generates a bingo card. The system automatically saves the card so the user can close the browser and return to it later. Each saved card receives a unique identifier, and the browser navigates to the cards page with that identifier in the query string.

**Why this priority**: Without persistence, all other features (viewing by ID, listing cards, saving updates) are impossible. This is the foundation of the entire feature.

**Independent Test**: Can be fully tested by creating a card with a title, closing the browser, reopening it, and navigating back to the card's URL to verify the card and its title are intact.

**Acceptance Scenarios**:

1. **Given** a user has entered 24 goals, **When** they are about to generate the card, **Then** they are prompted to provide a title for the card.
2. **Given** a user has entered a title and clicks "Generate Card", **When** the card is created, **Then** the card is saved with a unique identifier and the user is navigated to `/cards?id=<identifier>`.
3. **Given** a user has just generated and saved a card, **When** they copy the card's URL and open it in a new browser tab, **Then** the same card is displayed with its title and all goals in their original positions.
4. **Given** a user generates a card, **When** the save operation fails, **Then** the user sees a clear error message and can retry the save without losing their card data.

---

### User Story 2 - Persist Card Updates (Priority: P1)

While interacting with a saved bingo card, a user checks off completed goals, adds notes to cells, and edits goal titles. These changes are saved automatically so no work is lost if the user navigates away or closes the browser.

**Why this priority**: Saving updates is a core part of the card experience — without it, the card is effectively read-only after creation, defeating the purpose of an interactive bingo card.

**Independent Test**: Can be tested by toggling a cell's completion, adding notes, closing the browser, returning to the card URL, and verifying all changes persisted.

**Acceptance Scenarios**:

1. **Given** a user is viewing a saved bingo card, **When** they toggle a cell's completion status, **Then** the change is persisted and visible when the page is reloaded.
2. **Given** a user is viewing a saved bingo card, **When** they add or edit notes on a cell, **Then** the notes are persisted and visible when the page is reloaded.
3. **Given** a user is viewing a saved bingo card, **When** they edit a goal title, **Then** the updated title is persisted and visible when the page is reloaded.
4. **Given** a user makes multiple rapid changes (e.g., toggling several cells quickly), **When** they reload the page, **Then** all changes are reflected without data loss.
5. **Given** a user is viewing a saved card and bingo lines are completed, **When** they return to the card later, **Then** the completed bingo count is accurate.
6. **Given** a user is viewing a saved bingo card, **When** they edit the card title inline, **Then** the updated title is persisted, and the sidebar reflects the new title immediately.

---

### User Story 3 - View a Saved Bingo Card by ID (Priority: P1)

A user navigates to `/cards?id=<identifier>` and sees the full bingo card with all its current state — title, goals, completion status, notes, and bingo count.

**Why this priority**: Direct access to a card by URL is essential for returning to a card, and enables future sharing capabilities.

**Independent Test**: Can be tested by navigating directly to `/cards?id=<identifier>` and verifying the complete card renders correctly.

**Acceptance Scenarios**:

1. **Given** a valid card identifier exists, **When** a user navigates to `/cards?id=<identifier>`, **Then** the full bingo card is displayed with its title, all goals, completion states, notes, and bingo count.
2. **Given** an invalid or non-existent card identifier, **When** a user navigates to `/cards?id=<bad-id>`, **Then** a user-friendly "card not found" message is displayed with a link to create a new card.
3. **Given** a user navigates to `/cards` with no `id` query parameter, **When** saved cards exist, **Then** the most recently created card is displayed by default.
4. **Given** a user navigates to `/cards` with no `id` query parameter, **When** no saved cards exist, **Then** an empty state is shown encouraging the user to create a card.
5. **Given** a user is viewing a card via its URL, **When** they interact with the card (toggle cells, add notes), **Then** those changes are saved just as they would be from the original session.

---

### User Story 4 - Browse Saved Bingo Cards via Sidebar (Priority: P2)

A user who has created multiple bingo cards can see a list of their saved cards in a sidebar on the `/cards` page. Each card is shown by its title. Clicking a card in the sidebar updates the query string to `/cards?id=<identifier>` and loads that card in the main area.

**Why this priority**: Improves usability for users with multiple cards, but the core save/load/view workflow functions without it.

**Independent Test**: Can be tested by creating multiple cards, then verifying their titles appear in the sidebar and clicking one navigates to the selected card.

**Acceptance Scenarios**:

1. **Given** a user has saved multiple bingo cards, **When** they navigate to `/cards`, **Then** a sidebar displays a list of their saved cards by title.
2. **Given** the sidebar is visible, **When** the user clicks on a card title, **Then** the URL updates to `/cards?id=<identifier>` and the selected card is displayed in the main area.
3. **Given** a user is viewing a card, **When** they look at the sidebar, **Then** the currently active card is visually highlighted.
4. **Given** a user has no saved cards, **When** they navigate to `/cards`, **Then** the sidebar shows an empty state message encouraging them to create a card.
5. **Given** a user creates a new card, **When** they are navigated to `/cards?id=<new-id>`, **Then** the newly created card appears in the sidebar list.
6. **Given** a user is viewing the sidebar, **When** they click the delete action on a card, **Then** a confirmation prompt is shown before the card is removed.
7. **Given** the delete confirmation prompt is shown, **When** the user confirms, **Then** the card is removed from storage and the sidebar list, and if it was the active card, the view switches to the next available card or the empty state.
8. **Given** the delete confirmation prompt is shown, **When** the user cancels, **Then** the card is not deleted and the view remains unchanged.

---

### Edge Cases

- What happens when the user's storage is full or unavailable? The system displays a clear error and does not silently drop data.
- What happens when a user tries to access `/cards?id=<malformed>` with a malformed identifier? The system shows a "card not found" message rather than crashing.
- What happens when the user provides no title for a card? The system requires a title before saving — it cannot be empty.
- What happens if two browser tabs have the same card open and both make changes? The most recent save wins; the user is not shown conflicting states.
- What happens when a card is deleted or corrupted in storage? The card list gracefully omits it and accessing it by URL shows the "not found" state.
- What happens when a user deletes the currently active card? The system switches to the next available card, or shows the empty state if no cards remain.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST assign a unique identifier to each bingo card upon creation.
- **FR-002**: System MUST allow users to provide a title for a bingo card before generating it.
- **FR-003**: System MUST require a non-empty title before a card can be saved.
- **FR-004**: System MUST persist the full card state (title, goals, cell positions, completion status, notes, bingo line progress) when a card is created.
- **FR-005**: System MUST automatically persist changes to a card (card title, cell completion, notes, goal titles) without requiring an explicit "save" action from the user.
- **FR-006**: System MUST use the URL pattern `/cards?id=<identifier>` to display a specific saved card.
- **FR-007**: System MUST load and display the most recently created saved card by default when a user navigates to `/cards` without an `id` query parameter.
- **FR-008**: System MUST display a user-friendly "card not found" message when the `id` query parameter references an invalid or non-existent card.
- **FR-009**: System MUST provide a sidebar list of saved cards on the `/cards` page, showing each card by its title, sorted by most recently created first.
- **FR-010**: System MUST visually highlight the currently active card in the sidebar.
- **FR-011**: System MUST allow users to navigate between saved cards by clicking a card title in the sidebar, updating the URL to `/cards?id=<identifier>`.
- **FR-012**: System MUST navigate the user to `/cards?id=<new-id>` after generating a card.
- **FR-013**: System MUST handle storage failures gracefully, showing an error message without losing in-memory card state.
- **FR-014**: System MUST allow users to delete a saved card via an inline delete action in the sidebar, preceded by a confirmation prompt (e.g., "Delete this card? This cannot be undone.").
- **FR-015**: System MUST remove the deleted card from storage and the sidebar list, and navigate to the next available card (or empty state) if the deleted card was active.

### Key Entities

- **Bingo Card**: A saved card identified by a unique ID. Contains a user-provided title, an ordered set of 25 cells (including the free space), completion status of each cell, notes per cell, and the list of completed bingo lines. Includes metadata such as a creation timestamp.
- **Card List**: A collection of all saved bingo cards belonging to the current user, displayed by title in the sidebar navigation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can close the browser and return to a saved card via its URL with 100% data fidelity — all goals, notes, completion states, and bingo counts are intact.
- **SC-002**: Card changes (toggle completion, edit notes, edit title) are persisted within 1 second of the user action, with no explicit save step required.
- **SC-003**: Users with multiple saved cards can switch between them in under 2 seconds using the sidebar.
- **SC-004**: Navigating to an invalid card URL shows a helpful "not found" message within 1 second rather than a blank page or error.
- **SC-005**: 95% of users can create a card, close the browser, and find their card again without assistance.

## Clarifications

### Session 2026-03-21

- Q: Can users delete saved bingo cards? → A: Yes, users can delete cards from the sidebar via an inline delete action per card.
- Q: What order are cards listed in the sidebar? → A: Most recently created first (newest at top).
- Q: Can the card title be edited after creation? → A: Yes, title is editable inline on the card view and auto-saved like other changes.
- Q: Should card deletion require confirmation? → A: Yes, a confirmation prompt is required before deleting (irreversible with client-side storage).

## Assumptions

- Persistence is local to the user's browser (client-side storage). There is no backend server or database. Cards are not shared across devices.
- Each user manages their own cards; there is no multi-user or authentication model.
- Card identifiers are generated client-side and are unique enough for local storage (e.g., UUID or similar).
- Auto-save is the expected behavior — there is no manual "save" button. Changes are persisted as they occur.
- The sidebar card list shows all cards stored locally, with no pagination needed for a reasonable number of cards (under 100).
- The sidebar is collapsible or non-intrusive on mobile viewports to preserve the card viewing experience.
