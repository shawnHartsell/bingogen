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

// ─── Persisted Document ───────────────────────────────────
export interface BingoCardDocument {
  _id?: string; // MongoDB ObjectId as string
  title: string;
  cells: Cell[];
  completedBingos: number[];
  createdAt: Date;
  updatedAt: Date;
}

// ─── Sidebar Projection ──────────────────────────────────
export interface CardListItem {
  _id: string;
  title: string;
  createdAt: Date;
}

// ─── Application State ───────────────────────────────────
export interface AppState {
  // Phase 1: Goal entry
  goals: string[]; // 0–24 goals entered so far

  // Phase 2: Card generated
  cells: Cell[]; // 25 cells (flat, row-major), empty until card generation
  cardGenerated: boolean; // true after Generate Card action

  // Phase 3: Bingo tracking
  completedBingos: number[]; // indices of completed bingo lines (0–11)
  newBingos: number[]; // lines completed by the LAST toggle only (animation trigger)

  // Phase 4: Persistence
  cardId: string | null; // MongoDB _id of the active card (null before first save)
  cardTitle: string; // Editable card title
}

// ─── Actions ──────────────────────────────────────────────
export type AppAction =
  | { type: "ADD_GOAL"; goal: string }
  | { type: "REMOVE_GOAL"; index: number }
  | { type: "GENERATE_CARD" }
  | { type: "TOGGLE_COMPLETION"; cellIndex: number }
  | { type: "UPDATE_NOTES"; cellIndex: number; notes: string }
  | { type: "UPDATE_GOAL_TITLE"; cellIndex: number; title: string }
  | { type: "SET_CARD_TITLE"; title: string }
  | { type: "LOAD_CARD"; card: BingoCardDocument }
  | { type: "RESET" };
