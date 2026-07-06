// ─── Constants ────────────────────────────────────────────
export const GOALS_REQUIRED = 24;
export const MAX_GOAL_LENGTH = 100;
export const MAX_NOTES_LENGTH = 500;
export const GRID_SIZE = 5;
export const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;
export const FREE_SPACE_INDEX = 12; // center cell [2,2]
export const TOTAL_BINGO_LINES = 12; // 5 rows + 5 cols + 2 diags

// ─── Entities ─────────────────────────────────────────────
export interface Cell {
  row: number; // 0-4
  col: number; // 0-4
  goalTitle: string; // display text
  isFreeSpace: boolean;
  isCompleted: boolean;
  notes: string; // Markdown content, max 500 chars
}

// ─── Card Collection ──────────────────────────────────────
// A collection member: a full, durable snapshot of one bingo card, keyed by
// a stable `id`. This is the same shape persisted through the repository
// port (see lib/persistence/types.ts).
export interface CardRecord {
  id: string;
  name: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  schemaVersion: number;
  cells: Cell[]; // 25 cells (flat, row-major)
  completedBingos: number[]; // indices of completed bingo lines (0–11)
}

// ─── Application State ───────────────────────────────────
// The collection is the durable source of truth: cards keyed by a stable
// `id`, plus which one is active. Only the active card renders on the board.
export interface CollectionState {
  // Phase 1: Goal entry
  goals: string[]; // 0–24 goals entered so far, before a card exists

  // Phase 2+: Persisted collection
  cards: Record<string, CardRecord>;
  activeCardId: string | null;

  // Phase 3: Bingo tracking (ephemeral, not persisted)
  newBingos: number[]; // lines completed by the LAST toggle only (animation trigger)
}

/**
 * The legacy flat "board view" shape consumed by page/UI components. It is
 * derived from `CollectionState` (see `selectAppState` in lib/appReducer.ts)
 * so existing components render the active card without needing to know
 * about the collection.
 */
export interface AppState {
  goals: string[];
  cells: Cell[];
  cardGenerated: boolean;
  completedBingos: number[];
  newBingos: number[];
}

// ─── Actions ──────────────────────────────────────────────
export type AppAction =
  | { type: "ADD_GOAL"; goal: string }
  | { type: "REMOVE_GOAL"; index: number }
  | { type: "GENERATE_CARD" }
  | { type: "TOGGLE_COMPLETION"; cellIndex: number }
  | { type: "UPDATE_NOTES"; cellIndex: number; notes: string }
  | { type: "UPDATE_GOAL_TITLE"; cellIndex: number; title: string }
  | { type: "RESET" }
  | { type: "HYDRATE"; cards: CardRecord[]; activeCardId: string | null };
