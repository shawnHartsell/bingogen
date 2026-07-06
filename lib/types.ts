// ─── Constants ────────────────────────────────────────────
export const GOALS_REQUIRED = 24;
export const MAX_GOAL_LENGTH = 100;
export const MAX_NOTES_LENGTH = 500;
export const GRID_SIZE = 5;
export const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;
export const FREE_SPACE_INDEX = 12; // center cell [2,2]
export const TOTAL_BINGO_LINES = 12; // 5 rows + 5 cols + 2 diags

// Bump whenever the persisted BingoCard shape changes in a
// backward-incompatible way. Stored payloads with a missing or older
// schemaVersion are ignored rather than crashing the app.
export const CURRENT_SCHEMA_VERSION = 1;

// ─── Entities ─────────────────────────────────────────────
export interface Cell {
  row: number; // 0-4
  col: number; // 0-4
  goalTitle: string; // display text
  isFreeSpace: boolean;
  isCompleted: boolean;
  notes: string; // Markdown content, max 500 chars
}

// A single persisted collection member: a full snapshot of one bingo
// card, including identity fields so it can be stored/listed/loaded
// independently of app state.
export interface BingoCard {
  id: string;
  name: string;
  cells: Cell[];
  completedBingos: number[]; // indices of completed bingo lines (0–11)
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  schemaVersion: number;
}

// ─── Application State ───────────────────────────────────
export interface AppState {
  // Phase 1: Goal entry
  goals: string[]; // 0–24 goals entered so far

  // Phase 2+: Card collection
  cards: Record<string, BingoCard>; // all known cards, keyed by id
  activeCardId: string | null; // the card currently rendered on the board

  // Phase 3: Bingo tracking (ephemeral, not persisted)
  newBingos: number[]; // lines completed by the LAST toggle only (animation trigger)

  // Rehydration
  hydrated: boolean; // true once the collection has been loaded from the repository
}

// ─── Actions ──────────────────────────────────────────────
export type AppAction =
  | { type: "ADD_GOAL"; goal: string }
  | { type: "REMOVE_GOAL"; index: number }
  | { type: "GENERATE_CARD" }
  | { type: "TOGGLE_COMPLETION"; cellIndex: number }
  | { type: "UPDATE_NOTES"; cellIndex: number; notes: string }
  | { type: "UPDATE_GOAL_TITLE"; cellIndex: number; title: string }
  | {
      type: "HYDRATE";
      cards: BingoCard[];
      activeCardId: string | null;
    }
  | { type: "RESET" };

// ─── Persistence Port ────────────────────────────────────
// Async by design (Promise-returning) even though the current backing
// (localStorage) is synchronous, so a future API/DB backend is a pure
// implementation swap. Implementations must be SSR-safe (no throwing
// when `window`/`localStorage` is unavailable) and must surface write
// failures (e.g. quota exceeded) by rejecting rather than dropping them.
export interface CardRepository {
  listCards(): Promise<BingoCard[]>;
  loadCard(id: string): Promise<BingoCard | null>;
  saveCard(card: BingoCard): Promise<void>;
  deleteCard(id: string): Promise<void>;
  getActiveCardId(): Promise<string | null>;
  setActiveCardId(id: string | null): Promise<void>;
}
