# Feature Specification: Bingo Card Creation UX

**Feature Branch**: `001-card-creation-ux`
**Created**: 2026-03-01
**Updated**: 2026-03-06
**Status**: Draft (Revision 2)
**Input**: User description: "I am building a modern bingo card generator for tracking yearly goals. I want it to look sleek, something that would standout, but minimal. The generator should take a list of goals and generate the card. The cell in the card should allow me to track subgoals. For example, if my goal is to go to five concerts I should be able to add a checklist tracking where I've been. This can be as simple as a Markdown editor for now. For now, let's focus on the UX of creating a card before we move on to persisting it"

## Clarifications

### Session 2026-03-01

- Q: How does the user differentiate between opening the detail view and marking a goal complete? → A: Click opens detail view; a small checkbox/icon on each cell toggles completion.
- Q: What order are goals placed into the grid? → A: Goals are shuffled randomly each time "Generate Card" is pressed.
- Q: What UI element is the detail view? → A: Modal/dialog overlay (centered, dismissible backdrop).
- Q: What does the "visual celebration" for a bingo look like? → A: Brief highlight/glow animation on the completed line (1–2 seconds).
- Q: How does the user navigate between goal entry and the card? → A: Separate views — generation transitions to card view; a button navigates back to goal entry. Future features will add routes for card list and individual card views.

### Session 2026-03-06

- Q: Should the user see the grid while entering goals? → A: Yes. The grid should be progressively built as goals are added so the user can visualize the card taking shape.
- Q: Should the user be able to edit goals after generating the card? → A: Yes. Goals should be editable inline on the generated card. The user should not need to navigate back to a separate creation screen.
- Q: What happens to the "Edit Goals" back-navigation pattern? → A: Removed. Once the card is created, goals are edited directly in the card view. The creation view is only used once — to enter goals and create the card.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Enter Goals with Progressive Grid Preview (Priority: P1)

A user arrives at the app and sees a single text field for entering
a goal, an "Add" button, and a 5×5 bingo grid below. The grid
starts mostly empty — only the center cell is visible as the free
space. As the user types and adds goals one at a time, each goal
fills the next available cell in the grid, giving a live preview
of the card taking shape. Each added goal appears both in the grid
and has a way to be removed (e.g., clicking a remove action on the
cell or on a list). A running counter (e.g., "12 / 24") shows
progress. The "Create Card" button remains disabled until exactly
24 goals are in the grid. The grid shows empty placeholder cells
for positions not yet filled.

**Why this priority**: Without card creation there is no product.
The progressive preview is the core improvement — it lets users
see their card forming as they build it, creating a more engaging
and intuitive experience than entering a flat list.

**Independent Test**: Type and add 24 goals one at a time, watch
each goal appear in the grid as it's added, confirm the Create
button becomes enabled, and verify the grid is fully populated
with one goal per cell and a free center space.

**Acceptance Scenarios**:

1. **Given** the user is on the home page, **When** the page
   loads, **Then** a 5×5 grid is visible with the center cell
   marked as a free space and the remaining 24 cells shown as
   empty placeholders.
2. **Given** the user is on the home page, **When** they type a
   goal and press "Add" (or Enter), **Then** the goal appears in
   the next available cell in the grid and the counter increments.
3. **Given** the user has entered fewer than 24 goals, **When**
   they view the grid, **Then** filled cells display goal text,
   unfilled cells show a placeholder state, and the "Create Card"
   button is disabled.
4. **Given** the grid has some goals, **When** the user removes a
   goal, **Then** the goal is removed from the grid, the counter
   decrements, and the remaining goals are repositioned to fill
   the gap.
5. **Given** the list contains 24 goals, **When** the user views
   the page, **Then** the "Create Card" button becomes enabled
   and the input field is disabled (no more goals can be added).
6. **Given** 24 goals are in the grid, **When** the user presses
   "Create Card", **Then** the app shuffles the goals into a
   random arrangement in the grid, transitions to the card view,
   and the creation screen is no longer accessible for this card.

---

### User Story 2 - View and Interact with the Bingo Card (Priority: P2)

After creating a card, the app transitions to a dedicated card
view showing a sleek, minimal bingo grid. Each cell displays the
goal text. The card uses a modern visual style with clear cell
boundaries, readable typography, and a distinguished free space
in the center. The layout is responsive and looks good on both
desktop and mobile screens. There is no "Edit Goals" back-navigation
button — goal editing is handled inline (see User Story 5).

**Why this priority**: The visual presentation is what makes this
app feel polished and worth using over a spreadsheet. It directly
supports the "sleek and standout" design goal.

**Independent Test**: Create a card and verify the grid renders
with proper styling on desktop and mobile viewports.

**Acceptance Scenarios**:

1. **Given** a card has been created, **When** the app transitions
   to the card view, **Then** all 25 cells are visible in a 5×5
   grid with the center cell marked as a free space.
2. **Given** a card is displayed on a desktop browser, **When** the
   user resizes to a mobile viewport, **Then** the card layout
   adapts and remains readable without horizontal scrolling.
3. **Given** a cell contains a long goal text, **When** the card is
   rendered, **Then** the text is clamped to two lines with overflow
   hidden (CSS `line-clamp-2`) without breaking the grid layout.

---

### User Story 3 - View Notes and Track Subgoals Within a Cell (Priority: P3)

The user clicks on a bingo cell to open a centered modal dialog for
that goal. The modal displays the goal title as a header, a
Markdown editor with the cell's notes (or empty if none exist),
and a live preview below. The user can immediately write or update
notes and checklists (e.g., `- [ ]` syntax) without needing to
click an Edit button first. Checkboxes rendered in the preview are
interactive — the user can toggle them directly. A "Save" button
persists changes and closes the modal. The modal can also be
dismissed by clicking the backdrop or pressing Escape, both of
which save changes automatically. Changes are held in memory for
the current session (no persistence yet).

**Why this priority**: Subgoal tracking elevates this from a static
card to an interactive tool. It depends on the card already existing
(P1) and looking good (P2).

**Independent Test**: Create a card, click a cell, type a Markdown
checklist in the editor, verify the live preview shows checkboxes,
press Save, reopen the cell, and confirm the notes persisted.

**Acceptance Scenarios**:

1. **Given** a card is displayed, **When** the user clicks on a
   cell that has no notes, **Then** a centered modal opens showing
   the goal title as a header, an empty Markdown editor, and a
   live preview area below.
2. **Given** a card is displayed, **When** the user clicks on a
   cell that has existing notes, **Then** a centered modal opens
   showing the goal title as a header, the notes loaded in the
   Markdown editor, and the formatted preview rendered below.
3. **Given** the detail view is open, **When** the user types
   Markdown with a checklist (`- [ ] item`), **Then** the live
   preview shows checkboxes without bullet markers.
4. **Given** the detail view is open, **When** the user clicks a
   rendered checkbox in the preview, **Then** the checkbox toggles
   and the underlying Markdown source is updated (`- [ ]` ↔
   `- [x]`).
5. **Given** the detail view is open, **When** the user presses
   "Save", **Then** the notes are persisted and the modal closes.
6. **Given** the detail view is open, **When** the user clicks
   the backdrop, presses Escape, or clicks the close button,
   **Then** notes are saved and the modal closes.
7. **Given** the user has entered content, **When** they close and
   reopen the same cell, **Then** the previously entered content
   is still present (within the same browser session).
8. **Given** the detail view is open, **When** the user's
   Markdown content reaches 500 characters, **Then** the editor
   prevents further input and displays a character count indicator.

---

### User Story 4 - Mark Goals as Completed and Achieve Bingos (Priority: P4)

The user can mark any goal cell as completed using a small checkbox
or icon visible on each cell in the grid. Clicking the cell body
(outside the checkbox) opens the detail view instead. Completed cells
are visually distinct (e.g., highlighted, checked, or stamped). The
free space is always considered completed. When a full
row, column, or diagonal of 5 cells is completed, that line is
recognized as a "bingo" with a visual celebration. The user can
continue completing goals and achieve multiple bingos — up to 12
possible (5 rows + 5 columns + 2 diagonals). A bingo counter shows
how many bingos have been achieved.

**Why this priority**: Completion tracking is what makes this a
functional goal tracker rather than just a pretty grid. It depends
on the card (P1), the visual design (P2), and ideally subgoal
notes (P3) to be fully useful.

**Independent Test**: Create a card, mark 5 cells in a row as
complete, and verify a bingo is recognized with a visual indicator.

**Acceptance Scenarios**:

1. **Given** a card is displayed, **When** the user clicks the
   completion checkbox/icon on a goal cell, **Then** the cell is
   visually updated to show a completed state.
2. **Given** a cell is marked completed, **When** the user views
   the card, **Then** the completed cell is clearly distinguished
   from incomplete cells.
3. **Given** a completed cell, **When** the user clicks its
   checkbox/icon again, **Then** the cell returns to an
   incomplete state.
4. **Given** a card is displayed, **When** the user clicks the
   cell body (not the checkbox), **Then** the detail view opens
   (not a completion toggle).
5. **Given** the user completes all 5 cells in a row, column, or
   diagonal (free space counts as completed), **When** the last
   cell in that line is marked complete, **Then** the system
   recognizes a bingo and plays a brief highlight/glow animation
   (1–2 seconds) on the cells in that line.
6. **Given** the user has achieved one bingo, **When** they
   continue completing goals in other lines, **Then** additional
   bingos are recognized independently — multiple bingos can
   coexist.
7. **Given** multiple bingos have been achieved, **When** the user
   views the card, **Then** a bingo counter displays the total
   (e.g., "3 / 12 Bingos").

---

### User Story 5 - Edit Goals Inline on the Generated Card (Priority: P5)

Once the card has been created, the user can edit any goal directly
on the card view without navigating back to the creation screen.
The user double-clicks the goal text on a
cell to enter inline editing mode for that cell. The goal text
becomes editable in place. The user can change the text and confirm
the edit, or cancel to keep the original. The same 100-character
limit applies. Other cells remain unaffected while one is being
edited. Completion state and notes are preserved when a goal is
renamed. On touch devices, the same double-tap gesture activates
inline editing; a future iteration may add a dedicated edit icon
for improved mobile discoverability.

**Why this priority**: Inline editing removes friction when users
realize a goal is worded incorrectly or want to refine it. It
depends on the card being created (P1) and displayed (P2). It
replaces the previous "Edit Goals" back-navigation pattern, which
was disruptive and required regenerating the entire card.

**Independent Test**: Create a card, edit a goal's text directly
on the card, confirm the change persists, and verify the cell's
notes and completion state are unchanged.

**Acceptance Scenarios**:

1. **Given** a card is displayed, **When** the user double-clicks
   a goal cell (or double-taps on touch), **Then** the cell enters
   an editable state with the current goal text ready to modify.
2. **Given** a cell is in inline edit mode, **When** the user
   changes the text and confirms (e.g., presses Enter or clicks
   a save action), **Then** the cell displays the updated goal
   text.
3. **Given** a cell is in inline edit mode, **When** the user
   cancels (e.g., presses Escape), **Then** the cell reverts to
   the original goal text.
4. **Given** a cell is in inline edit mode, **When** the user
   types more than 100 characters, **Then** the input is
   prevented or truncated and a limit indicator is shown.
5. **Given** a cell has notes and is marked complete, **When**
   the user edits the goal text, **Then** the notes and
   completion state are preserved after the edit.
6. **Given** the free space cell, **When** the user attempts to
   edit it, **Then** nothing happens — the free space is not
   editable.

---

### Edge Cases

- What happens when the user types a goal with leading/trailing
  whitespace? The system MUST trim whitespace before adding it
  to the grid.
- What happens when the user submits an empty input? The system
  MUST ignore the submission (no empty goals added).
- What happens when a goal exceeds 100 characters? The system
  MUST prevent the goal from being added and display an inline
  error indicating the 100-character limit.
- What happens when the user enters a duplicate goal? Duplicates
  are accepted — the user may intentionally repeat a goal.
- What happens when 24 goals are already in the grid? The input
  field MUST be disabled so no additional goals can be added.
- What happens when the user removes a goal during creation? The
  remaining goals shift to fill the gap in the grid, and the
  counter decrements.
- What happens when Markdown content in a cell reaches 500
  characters? The editor MUST prevent further input and show
  a character count so the user knows the limit.
- What happens when the user marks and unmarks cells rapidly?
  Bingo detection MUST recalculate correctly after each toggle.
- What happens when the user unmarks a cell that was part of a
  bingo? The bingo for that line is revoked and the counter
  decrements.
- What happens when the browser tab is refreshed? All goal list,
  card data, notes, and completion state is lost (expected —
  persistence is out of scope).
- What happens when the user edits a goal that is part of a
  completed bingo line? The bingo state is preserved — only
  completion toggles affect bingo detection, not text edits.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST display a single text field and an "Add"
  button for entering one goal at a time.
- **FR-001a**: System MUST add the goal to the next available cell
  in the 5×5 grid when the user presses "Add" or the Enter key.
- **FR-001b**: System MUST enforce a maximum length of 100 characters
  per goal, preventing submission and showing an error when exceeded.
- **FR-001c**: System MUST disable the input field once 24 goals
  have been added.
- **FR-002**: System MUST display a 5×5 bingo grid below the input
  during goal entry, progressively populating cells as goals are
  added. Empty cells MUST show a distinct placeholder state.
- **FR-002a**: The center cell of the grid MUST always display as
  the free space, even when the grid is partially filled.
- **FR-003**: System MUST provide a "Create Card" action that
  randomly shuffles the 24 goals into a new arrangement in the
  grid and transitions the user to the card view.
- **FR-003a**: Once a card is created, the creation screen is no
  longer accessible for that card. Goal editing is performed
  inline on the card view.
- **FR-004**: System MUST require exactly 24 goals before allowing
  card creation.
- **FR-005**: System MUST display a live goal counter showing the
  current count versus the required 24 (e.g., "12 / 24").
- **FR-006**: System MUST disable the "Create Card" button when
  the goal count is not exactly 24.
- **FR-006a**: System MUST allow the user to remove any goal from
  the grid during creation via a remove action on the cell or a
  companion list.
- **FR-007**: System MUST render the bingo card with a modern,
  minimal visual design — clean typography, clear cell boundaries,
  balanced whitespace.
- **FR-008**: System MUST support responsive layout so the card is
  usable on screens from 375px to 1440px wide.
- **FR-009**: System MUST allow users to click the body of any
  non-free cell to open a centered modal dialog for that goal.
  Clicking the completion checkbox/icon MUST NOT open the modal.
- **FR-009a**: The detail view MUST display the goal title as a
  header, a Markdown editor with the cell's notes, and a live
  preview below the editor.
- **FR-009b**: When no notes have been entered, the detail view
  MUST open with an empty Markdown editor ready for input.
- **FR-009c**: The detail view MUST include a "Save" button that
  persists changes and closes the modal.
- **FR-009d**: Dismissing the modal via backdrop click, Escape, or
  the close button MUST save any pending changes before closing.
- **FR-010**: The Markdown editor MUST support standard Markdown
  syntax including checklists.
- **FR-010a**: The Markdown editor MUST enforce a maximum of 500
  characters, preventing further input and displaying a character
  count when the limit is reached.
- **FR-010b**: Rendered task-list checkboxes MUST be interactive —
  the user can toggle them without entering edit mode. Toggling
  updates the underlying Markdown source.
- **FR-010c**: Task-list items MUST render as checkboxes without
  bullet markers.
- **FR-011**: The detail view MUST render a live preview of the
  Markdown content.
- **FR-012**: System MUST retain Markdown content in memory for
  the current browser session (no server persistence).
- **FR-013**: System MUST allow the user to close the detail view
  and return to the card.
- **FR-014**: System MUST trim leading/trailing whitespace from
  goal input and reject empty submissions.
- **FR-015**: Each non-free cell MUST display a small checkbox or
  icon that toggles the cell between complete and incomplete states.
  This control MUST be visually separate from the cell body click
  target that opens the detail view.
- **FR-015a**: Completed cells MUST be visually distinct from
  incomplete cells on the card.
- **FR-015b**: The free space MUST always be considered completed.
- **FR-016**: System MUST detect a bingo when all 5 cells in any
  row, column, or diagonal are completed.
- **FR-016a**: System MUST support multiple simultaneous bingos
  (up to 12: 5 rows + 5 columns + 2 diagonals).
- **FR-016b**: System MUST display a brief highlight/glow animation
  (1–2 seconds) on the cells of the completed line when a new
  bingo is achieved.
- **FR-016c**: System MUST display a bingo counter showing achieved
  bingos versus total possible (e.g., "3 / 12 Bingos").
- **FR-016d**: System MUST revoke a bingo when a cell in that line
  is toggled back to incomplete.
- **FR-017**: System MUST allow the user to edit any goal's text
  inline on the card view (after card creation).
- **FR-017a**: Inline editing MUST enforce the same 100-character
  limit as goal entry.
- **FR-017b**: Inline editing MUST preserve the cell's notes and
  completion state.
- **FR-017c**: The free space cell MUST NOT be editable.
- **FR-017d**: Inline editing MUST be cancellable, reverting the
  cell to its previous text.

### Key Entities

- **Goal**: A single yearly objective provided by the user. Has a
  display title (the text entered), optional subgoal notes
  (Markdown content), and a completion state (complete/incomplete).
- **Bingo Card**: A 5×5 grid of cells. Contains exactly 25 cells —
  24 goal cells and 1 free space (center).
- **Cell**: A position in the bingo grid. Has a row, column,
  assigned goal (or free space designation), associated Markdown
  notes, and a completion flag.
- **Bingo**: A completed line of 5 cells (row, column, or diagonal).
  Up to 12 bingos are possible per card.

## Assumptions

- This is a single-user, single-session experience — no accounts,
  no sharing, no multi-device sync.
- The creation view is a one-time flow. Once a card is created,
  the user works entirely in the card view. A future feature may
  allow creating multiple cards.
- Goals are edited inline on the card view after creation. There
  is no separate "edit goals" screen or back-navigation.
- The visual design should feel modern and polished but does not
  require a specific design system or brand guidelines.
- "Sleek and standout" is interpreted as: dark or muted color
  palette, generous spacing, crisp borders, modern sans-serif
  typography.
- Markdown rendering supports standard CommonMark including task
  lists (`- [ ]` / `- [x]`).
- No print or export functionality is required for this feature.
- No drag-and-drop reordering of cells is required.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can enter 24 goals and create a bingo card
  in under 5 minutes while seeing the grid build progressively.
- **SC-002**: The generated card is visually complete and readable
  on both a 375px mobile screen and a 1440px desktop screen.
- **SC-003**: A user can open a cell, write a 5-item Markdown
  checklist, see it rendered with interactive checkboxes, and
  close the detail view within 60 seconds on first attempt.
- **SC-004**: All 24 goal cells plus the free space are correctly
  displayed with no overlapping text or broken layout.
- **SC-005**: Subgoal notes entered in a cell persist when the
  detail view is closed and reopened within the same session.
- **SC-006**: A user can mark 5 cells in a line as complete and
  see a bingo recognized within 1 second of the last completion.
- **SC-007**: Completed cells are visually distinguishable from
  incomplete cells at a glance without reading text.
- **SC-008**: A user can edit a goal's text directly on the card
  view and see the change reflected immediately, without losing
  any notes or completion state.
