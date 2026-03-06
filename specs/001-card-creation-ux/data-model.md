# Data Model: Bingo Card Creation UX

**Feature**: `001-card-creation-ux` | **Date**: 2026-03-01
**Source**: [spec.md](spec.md), [research.md](research.md)

---

## Overview

All data lives in React client memory via Context + `useReducer`. No persistence layer. Browser refresh clears all state (per spec assumption A-003).

---

## Entities

### Goal

A single yearly goal entered by the user.

| Field   | Type     | Constraints                                     | Source                  |
| ------- | -------- | ----------------------------------------------- | ----------------------- |
| `title` | `string` | 1–100 characters; trimmed; non-empty after trim | FR-001, FR-001b, FR-014 |

**Notes**: Goals are stored as an ordered list of strings during entry. After card generation, goals are shuffled and embedded into cells. The `Goal` is not a separate runtime entity — it's a `string` in the `goals` array.

```ts
// No dedicated Goal type — just string[]
type Goals = string[]; // length 0–24
```

---

### Cell

A single cell in the 5×5 bingo grid.

| Field         | Type      | Constraints                                              | Source                 |
| ------------- | --------- | -------------------------------------------------------- | ---------------------- |
| `row`         | `number`  | 0–4                                                      | Spec entity definition |
| `col`         | `number`  | 0–4                                                      | Spec entity definition |
| `goalTitle`   | `string`  | The goal text (or "FREE" for center)                     | FR-006                 |
| `isFreeSpace` | `boolean` | `true` only for cell at [2,2]                            | FR-007                 |
| `isCompleted` | `boolean` | Default `false`; free space defaults `true`              | FR-015, FR-007         |
| `notes`       | `string`  | 0–500 characters; Markdown (CommonMark + GFM task lists) | FR-010, FR-010a        |

```ts
interface Cell {
  row: number; // 0-4
  col: number; // 0-4
  goalTitle: string; // display text
  isFreeSpace: boolean;
  isCompleted: boolean;
  notes: string; // Markdown content, max 500 chars
}
```

**Derivation**: After the user enters 24 goals and clicks Generate, the goals are Fisher-Yates shuffled, then placed into the 25-cell grid in row-major order. Cell [2,2] (index 12) is the free space — it receives `goalTitle: "FREE"`, `isFreeSpace: true`, `isCompleted: true`. The 24 shuffled goals fill the remaining 24 cells.

**Index mapping**: Cells are stored as a flat array of 25 elements. Index = `row * 5 + col`.

---

### BingoLine

A completed row, column, or diagonal. Not stored as a separate entity — derived on each toggle.

| Field         | Type       | Constraints                       | Source |
| ------------- | ---------- | --------------------------------- | ------ |
| `lineIndex`   | `number`   | 0–11 (5 rows + 5 cols + 2 diags)  | FR-016 |
| `cellIndices` | `number[]` | 5 cell indices that form the line | FR-016 |

```ts
// Not stored — computed by detectBingos()
// See lib/bingo.ts in research.md for BINGO_LINES constant
```

**Count**: Maximum 12 bingos (5 rows + 5 columns + 2 diagonals). Bingo count displayed as `X / 12` per FR-016c.

---

## Application State

The single source of truth managed by `useReducer`:

```ts
interface AppState {
  // Phase 1: Goal entry
  goals: string[]; // 0–24 goals entered so far

  // Phase 2: Card generated
  cells: Cell[]; // 25 cells (flat, row-major), empty until card generation
  cardGenerated: boolean; // true after Generate Card action

  // Phase 3: Bingo tracking (derived on each toggle, but stored for rendering)
  completedBingos: number[]; // indices of completed bingo lines (0–11)
  newBingos: number[]; // lines completed by the LAST toggle only (animation trigger)
}
```

### Initial State

```ts
const initialState: AppState = {
  goals: [],
  cells: [],
  cardGenerated: false,
  completedBingos: [],
  newBingos: [],
};
```

---

## Actions (Reducer)

| Action              | Payload                                | Effect                                                                                                                                                                    | Spec Reference         |
| ------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `ADD_GOAL`          | `{ goal: string }`                     | Append trimmed goal to `goals[]` (if length < 24 and 1–100 chars)                                                                                                         | FR-001, FR-003, FR-004 |
| `REMOVE_GOAL`       | `{ index: number }`                    | Remove goal at index from `goals[]`                                                                                                                                       | FR-001c                |
| `GENERATE_CARD`     | —                                      | Fisher-Yates shuffle `goals`, build 25 `Cell` objects, set `cardGenerated: true`                                                                                          | FR-005, FR-006, FR-007 |
| `TOGGLE_COMPLETION` | `{ cellIndex: number }`                | Flip `isCompleted` on cell (skip if free space), recompute `completedBingos`, diff against previous to set `newBingos` (animation trigger — only freshly completed lines) | FR-015, FR-016         |
| `UPDATE_NOTES`      | `{ cellIndex: number, notes: string }` | Set `notes` on cell (max 500 chars enforced at UI)                                                                                                                        | FR-010, FR-010a        |
| `CLEAR_CARD`        | —                                      | Preserve `goals[]`; reset `cells`, `cardGenerated`, `completedBingos`, `newBingos` (used by "Edit Goals" — keeps goal list per FR-002a)                                   | FR-002a                |
| `RESET`             | —                                      | Return to `initialState` (full state clear including goals)                                                                                                               | —                      |

---

## State Transitions

```text
                    ┌──────────────┐
                    │  ENTRY VIEW  │
                    │  goals: []   │
                    └──────┬───────┘
                           │
            ADD_GOAL / REMOVE_GOAL (repeat)
                           │
                    ┌──────▼───────┐
                    │  ENTRY VIEW  │
                    │  goals: [24] │
                    └──────┬───────┘
                           │
                     GENERATE_CARD
                           │
                    ┌──────▼───────┐
                    │  CARD VIEW   │
                    │  cells: [25] │◄── TOGGLE_COMPLETION
                    │  bingos: []  │◄── UPDATE_NOTES
                    └──────┬───────┘
                           │
                      CLEAR_CARD
                           │
                    ┌──────▼───────┐
                    │  ENTRY VIEW  │
                    │  goals: [24] │  (preserved)
                    └──────────────┘
```

---

## Validation Rules

| Rule                                     | Where Enforced                                    | Spec Reference    |
| ---------------------------------------- | ------------------------------------------------- | ----------------- |
| Goal title: 1–100 characters after trim  | `ADD_GOAL` reducer guard + UI disable             | FR-001b, FR-014   |
| Goal title: non-empty after trim         | `ADD_GOAL` reducer guard + UI disable             | FR-014            |
| Exactly 24 goals required for generation | `GENERATE_CARD` guard + UI disable on button      | FR-004, FR-005    |
| Notes: 0–500 characters                  | `UPDATE_NOTES` reducer guard + UI counter         | FR-010a, Edge-007 |
| Free space cannot be un-completed        | `TOGGLE_COMPLETION` guard (skip if `isFreeSpace`) | FR-007            |
| Cell index valid: 0–24                   | `TOGGLE_COMPLETION`, `UPDATE_NOTES` guards        | Defensive         |

---

## Relationships

```text
AppState
├── goals: string[]          ──(shuffle)──►  cells[].goalTitle
├── cells: Cell[25]
│   ├── Cell.isCompleted     ──(detectBingos)──►  completedBingos
│   └── Cell.notes           (independent per cell)
└── completedBingos: number[]  (derived from cells)
```

- `goals` → `cells`: One-time transformation via `GENERATE_CARD` (Fisher-Yates shuffle + placement)
- `cells[].isCompleted` → `completedBingos`: Recomputed on every `TOGGLE_COMPLETION` via `detectBingos()`
- `cells[].notes`: Independent per cell, no cross-cell dependencies
