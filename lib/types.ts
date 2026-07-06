// ─── Constants ────────────────────────────────────────────
export const GOALS_REQUIRED = 24;
export const MAX_GOAL_LENGTH = 100;
export const MAX_NOTES_LENGTH = 500;
export const GRID_SIZE = 5;
export const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;
export const FREE_SPACE_INDEX = 12; // center cell [2,2]
export const TOTAL_BINGO_LINES = 12; // 5 rows + 5 cols + 2 diags

/** Bump when the persisted card shape changes in a backward-incompatible way. */
export const CARD_SCHEMA_VERSION = 1;

// ─── Entities ─────────────────────────────────────────────
export interface Cell {
  row: number; // 0-4
  col: number; // 0-4
  goalTitle: string; // display text
  isFreeSpace: boolean;
  isCompleted: boolean;
  notes: string; // Markdown content, max 500 chars
}

/**
 * A single persisted collection member - a full, self-contained snapshot of
 * one bingo card. This is the unit the persistence port reads and writes.
 */
export interface BingoCard {
  id: string; // stable, unique identifier
  name: string; // user-facing / default timestamp-derived name
  cells: Cell[]; // 25 cells (flat, row-major)
  completedBingos: number[]; // derived indices of completed bingo lines (0–11)
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  schemaVersion: number; // CARD_SCHEMA_VERSION at time of write
}

// ─── Application State ───────────────────────────────────
export interface AppState {
  // Phase 1: Goal entry
  goals: string[]; // 0–24 goals entered so far

  // Phase 2+: Collection of persisted cards
  cards: Record<string, BingoCard>; // keyed by card id
  activeCardId: string | null; // the card currently on the board

  // Phase 3: Bingo tracking (transient, active-card-only)
  newBingos: number[]; // lines completed by the LAST toggle only (animation trigger)

  // Persistence lifecycle
  hydrated: boolean; // true once rehydration from the repository has run
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
  | {
      type: "HYDRATE";
      cards: BingoCard[];
      activeCardId: string | null;
    };

// ─── Persistence port ─────────────────────────────────────
/**
 * Async, client-only persistence port. The UI/state layer never touches
 * localStorage (or any backing store) directly - it only talks to this
 * contract. Intentionally Promise-based even though the current
 * implementation is backed by synchronous localStorage, so a future
 * API/DB-backed implementation is a pure swap.
 */
export interface CardRepository {
  /** List all persisted cards (order not guaranteed). */
  listCards(): Promise<BingoCard[]>;
  /** Load a single card by id, or null if not found/invalid. */
  loadCard(id: string): Promise<BingoCard | null>;
  /** Persist (create or replace) a card. Rejects on write failure (e.g. quota). */
  saveCard(card: BingoCard): Promise<void>;
  /** Remove a card by id. */
  deleteCard(id: string): Promise<void>;
  /** Get the id of the last-active card, or null. */
  getActiveCardId(): Promise<string | null>;
  /** Persist which card is active. */
  setActiveCardId(id: string | null): Promise<void>;
}
