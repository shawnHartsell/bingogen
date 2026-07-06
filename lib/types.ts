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

// ─── Application State (legacy/derived view) ─────────────
// This is the flattened shape components consume - it always reflects the
// *active* card in the collection (or the pre-generation goal-entry list
// when there is no active card yet). See CollectionState below for the
// actual source of truth.
export interface AppState {
  // Phase 1: Goal entry
  goals: string[]; // 0–24 goals entered so far

  // Phase 2: Card generated
  cells: Cell[]; // 25 cells (flat, row-major), empty until card generation
  cardGenerated: boolean; // true after Generate Card action

  // Phase 3: Bingo tracking
  completedBingos: number[]; // indices of completed bingo lines (0–11)
  newBingos: number[]; // lines completed by the LAST toggle only (animation trigger)

  // Persistence
  hydrated: boolean; // true once the collection has been rehydrated from the repository
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
  | { type: "HYDRATE"; cards: PersistedCard[]; activeCardId: string | null }
  | { type: "SAVE_ERROR"; message: string };

// ─── Persistence ──────────────────────────────────────────
// Current schema version for persisted cards. Bump whenever the shape of
// PersistedCard changes in a way that requires migration; stored cards with
// a missing or older schemaVersion are dropped rather than trusted as-is.
export const CURRENT_SCHEMA_VERSION = 1;

/**
 * A durable, named member of the card collection. This is the full snapshot
 * that is written to/read from the persistence port - it must contain
 * everything needed to restore the board exactly as the user left it.
 */
export interface PersistedCard {
  id: string; // stable, unique identifier
  name: string; // user-facing name (default: derived from createdAt)
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp, bumped on every mutation
  schemaVersion: number;
  goals: string[]; // the 24 goals used to build this card
  cells: Cell[]; // 25 cells (flat, row-major)
  cardGenerated: boolean; // always true for a persisted card
  completedBingos: number[]; // indices of completed bingo lines (0–11)
}

/**
 * The true source of application state: a collection of persisted cards
 * plus which one is active. `goals` here is only the pre-generation
 * goal-entry list (there is no active card yet).
 */
export interface CollectionState {
  goals: string[];
  cards: Record<string, PersistedCard>;
  activeCardId: string | null;
  newBingos: number[]; // transient UI-only, not persisted
  hydrated: boolean;
  saveError: string | null;
}

/**
 * Async persistence port. The UI/reducer never touches localStorage (or any
 * other backing store) directly - it only ever talks to this contract. This
 * makes swapping the backing (e.g. to an API/DB) a pure implementation
 * change with no consumer-side rewrite.
 */
export interface CardRepository {
  list(): Promise<PersistedCard[]>;
  load(id: string): Promise<PersistedCard | null>;
  save(card: PersistedCard): Promise<void>;
  delete(id: string): Promise<void>;
  loadActiveId(): Promise<string | null>;
  saveActiveId(id: string | null): Promise<void>;
}
