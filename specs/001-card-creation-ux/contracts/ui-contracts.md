# UI Contracts: Bingo Card Creation UX

**Feature**: `001-card-creation-ux` | **Date**: 2026-03-01
**Source**: [spec.md](spec.md), [data-model.md](data-model.md), [research.md](research.md)

---

## Overview

BingoGen is a client-only web application with no external APIs. The contracts defined here are **component interfaces** — the props, callbacks, and state shapes that form the boundaries between React components. These serve as the implementation contract for the `/speckit.tasks` phase.

---

## Route Contracts

### `/` — Goal Entry View

| Property         | Value                                      |
| ---------------- | ------------------------------------------ |
| Route file       | `app/page.tsx`                             |
| Type             | Client Component (`"use client"`)          |
| Reads from state | `goals: string[]`                          |
| Dispatches       | `ADD_GOAL`, `REMOVE_GOAL`, `GENERATE_CARD` |
| Navigates to     | `/card` (after `GENERATE_CARD`)            |

**Renders**: `GoalInput`, `GoalList`, `GoalCounter`, Generate Card button

### `/card` — Card View

| Property         | Value                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------- |
| Route file       | `app/card/page.tsx`                                                                           |
| Type             | Client Component (`"use client"`)                                                             |
| Reads from state | `cells: Cell[]`, `completedBingos: number[]`, `newBingos: number[]`, `cardGenerated: boolean` |
| Dispatches       | `TOGGLE_COMPLETION`, `UPDATE_NOTES`, `CLEAR_CARD`                                             |
| Navigates to     | `/` (on "Edit Goals" → dispatches `CLEAR_CARD` first)                                         |
| Guards           | If `!cardGenerated`, redirect to `/`                                                          |

**Renders**: `BingoCard`, `BingoCounter`, `CellModal`, "Edit Goals" button

---

## Component Contracts

### `GoalInput`

Single text field with Add button for entering one goal at a time.

```ts
interface GoalInputProps {
  onAdd: (goal: string) => void; // Called with trimmed goal text
  disabled: boolean; // true when 24 goals reached
  maxLength: number; // 100 (character limit)
}
```

**Behavior**:

- Text field accepts typing; Enter key or Add button submits
- Trims whitespace before calling `onAdd`
- Rejects empty-after-trim (does not call `onAdd`)
- Clears field after successful add
- Disabled state: input and button both disabled when `goals.length === 24`

**Spec**: FR-001, FR-001a, FR-001b, FR-014, Edge-001, Edge-002, Edge-004

---

### `GoalList`

Displays the current list of entered goals with remove actions.

```ts
interface GoalListProps {
  goals: string[];
  onRemove: (index: number) => void;
}
```

**Behavior**:

- Renders each goal with its text and a remove button/icon
- Remove button calls `onRemove(index)`
- Empty state: no list rendered (or subtle empty message)

**Spec**: FR-001c

---

### `GoalCounter`

Displays progress toward 24 goals.

```ts
interface GoalCounterProps {
  current: number; // goals.length
  target: number; // 24
}
```

**Renders**: `"{current} / {target}"` (e.g., "12 / 24")

**Spec**: FR-005

---

### `BingoCard`

5×5 grid layout containing 25 `BingoCell` components.

```ts
interface BingoCardProps {
  cells: Cell[];
  completedBingos: number[];
  newBingos: number[]; // lines completed by the LAST toggle only
  onCellClick: (cellIndex: number) => void;
  onToggleCompletion: (cellIndex: number) => void;
}
```

**Behavior**:

- Renders a 5×5 CSS Grid (responsive: shrinks for mobile, expands on desktop)
- Each cell rendered via `BingoCell`
- Computes `isNewBingo` per cell: true only if the cell belongs to a line in `newBingos` (not `completedBingos`). This ensures the celebration animation fires only for freshly completed lines, not lines that were already complete before the toggle.
- Responsive: 375px minimum viewport width

**Spec**: FR-007, FR-008, SC-002

---

### `BingoCell`

Individual cell in the bingo grid.

```ts
interface BingoCellProps {
  cell: Cell;
  isInBingo: boolean; // true if cell is part of any completed bingo line
  isNewBingo: boolean; // true if cell is part of a NEWLY completed bingo (for animation)
  onClick: () => void; // Opens detail modal (click on cell body)
  onToggleCompletion: () => void; // Toggles completion (click on checkbox/icon)
}
```

**Behavior**:

- Displays `cell.goalTitle` (truncated if needed for cell size)
- Small checkbox/icon in corner for completion toggle (separate click target from cell body)
- Completed cells: visually distinct styling (e.g., different background, checkmark)
- Free space: always shows as completed, checkbox disabled
- New bingo animation: applies `animate-bingo-glow` class when `isNewBingo`

**Spec**: FR-009, FR-009a, FR-015, FR-015a, FR-016b

---

### `CellModal`

Centered modal dialog for viewing/editing cell subgoal notes.

```ts
interface CellModalProps {
  open: boolean;
  onClose: () => void;
  cell: Cell | null;
  onSaveNotes: (notes: string) => void;
}
```

**Behavior**:

- Uses native `<dialog>` element with `showModal()`
- Two modes: **Read** (default on open) and **Edit** (after clicking Edit button)
- **Read mode**: Renders `cell.notes` as Markdown via `MarkdownPreview`. Shows "Edit" button.
- **Edit mode**: Shows `MarkdownEditor` textarea + live `MarkdownPreview`. Shows "Done" button.
- "Done" calls `onSaveNotes(notes)` and returns to read mode
- Dismiss: backdrop click, close button, or Escape key
- Displays cell's `goalTitle` as header

**Spec**: FR-009, FR-009a, FR-009b, FR-009c, FR-009d, FR-010, FR-010a

---

### `MarkdownPreview`

Read-only Markdown renderer.

```ts
interface MarkdownPreviewProps {
  content: string; // Raw Markdown string
}
```

**Behavior**:

- Renders CommonMark + GFM task lists via `react-markdown` + `remark-gfm`
- Empty content: shows subtle placeholder text (e.g., "No notes yet")

**Spec**: FR-009b, FR-010

---

### `MarkdownEditor`

Textarea for editing Markdown with character count.

```ts
interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  maxLength: number; // 500
}
```

**Behavior**:

- Plain textarea (no rich editor)
- Character counter: `"{value.length} / {maxLength}"` — warns visually near limit
- Prevents input beyond `maxLength` (HTML `maxLength` attribute + onChange guard)

**Spec**: FR-009c, FR-010a, Edge-007

---

### `BingoCounter`

Displays count of completed bingos.

```ts
interface BingoCounterProps {
  count: number; // completedBingos.length
  total: number; // 12
}
```

**Renders**: `"{count} / {total} Bingos"` (e.g., "3 / 12 Bingos")

**Spec**: FR-016c

---

## State Contract

### Context Provider

```ts
interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}
```

### Hook

```ts
function useApp(): AppContextValue;
// Throws if used outside AppProvider
```

### AppState (from data-model.md)

```ts
interface AppState {
  goals: string[];
  cells: Cell[];
  cardGenerated: boolean;
  completedBingos: number[];
  newBingos: number[];
}
```

### AppAction (from data-model.md)

```ts
type AppAction =
  | { type: "ADD_GOAL"; goal: string }
  | { type: "REMOVE_GOAL"; index: number }
  | { type: "GENERATE_CARD" }
  | { type: "TOGGLE_COMPLETION"; cellIndex: number }
  | { type: "UPDATE_NOTES"; cellIndex: number; notes: string }
  | { type: "CLEAR_CARD" }
  | { type: "RESET" };
```

---

## Utility Contracts

### `shuffle<T>(array: T[]): T[]`

Fisher-Yates shuffle. Returns a new array (does not mutate input).

**Location**: `lib/shuffle.ts`

### `detectBingos(completed: boolean[]): number[]`

Returns indices of completed bingo lines (0–11). Pure function.

**Input**: 25-element boolean array (index 12 always `true` for free space)
**Output**: Array of line indices where all 5 cells are completed

**Location**: `lib/bingo.ts`

### `findNewBingos(current: number[], previous: number[]): number[]`

Returns bingo line indices present in `current` but not in `previous`. Used to trigger celebration animation only for freshly completed lines.

**Input**: `current` — bingo line indices after toggle; `previous` — bingo line indices before toggle
**Output**: Array of newly completed line indices

**Location**: `lib/bingo.ts`
