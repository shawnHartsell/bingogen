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

// ─── Persistence ──────────────────────────────────────────
// Bump whenever the persisted shape changes in a way older clients can't read.
export const CURRENT_SCHEMA_VERSION = 1;

// A single card as it lives in the persisted collection - a full, self-contained
// snapshot (identity + board state). This is the one shape the repository,
// autosave, and rehydrate all agree on.
export interface PersistedCard {
  id: string;
  name: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  schemaVersion: number;
  cells: Cell[];
  completedBingos: number[];
}

// Minimal storage backing the repository needs (satisfied by window.localStorage
// or an in-memory mock in tests). Kept narrow so a future backend swap or a
// test double only needs to implement these three methods.
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

// Async persistence port. The UI/state layer only ever talks to this contract -
// never to localStorage directly - so a future API/DB backend is a pure
// implementation swap. All methods surface failures (e.g. quota exceeded) by
// rejecting rather than swallowing them.
export interface CardRepository {
  list(): Promise<PersistedCard[]>;
  load(id: string): Promise<PersistedCard | null>;
  save(card: PersistedCard): Promise<void>;
  delete(id: string): Promise<void>;
  getActiveCardId(): Promise<string | null>;
  setActiveCardId(id: string | null): Promise<void>;
}

// ─── Application State ───────────────────────────────────
export interface AppState {
  // Phase 1: Goal entry
  goals: string[]; // 0–24 goals entered so far

  // Persisted collection: cards keyed by stable id, plus which one is active.
  cards: Record<string, PersistedCard>;
  activeCardId: string | null;

  // True once rehydration from the repository has completed (successfully or
  // not), so the UI can avoid flashing/redirecting before the store is read
  // and avoid autosaving over persisted data with the initial empty state.
  hydrated: boolean;

  // Phase 2: Card generated
  cardGenerated: boolean; // true once there is an active card

  // Phase 3: Bingo tracking (ephemeral - not part of the persisted snapshot)
  newBingos: number[]; // lines completed by the LAST toggle only (animation trigger)
}

// Convenience view of the active card's board, derived by AppProvider for
// components that only care about "the current card" (there is no sidebar yet).
export interface ActiveCardView {
  cells: Cell[];
  completedBingos: number[];
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
      cards: Record<string, PersistedCard>;
      activeCardId: string | null;
    }
  | { type: "RESET" };
