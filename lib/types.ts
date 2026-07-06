// ─── Constants ────────────────────────────────────────────
export const GOALS_REQUIRED = 24;
export const MAX_GOAL_LENGTH = 100;
export const MAX_NOTES_LENGTH = 500;
export const GRID_SIZE = 5;
export const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;
export const FREE_SPACE_INDEX = 12; // center cell [2,2]
export const TOTAL_BINGO_LINES = 12; // 5 rows + 5 cols + 2 diags

// Bump whenever the persisted `BingoCard` shape changes in a
// backward-incompatible way. Stored payloads stamped with an older/missing
// version (or no version at all) are treated as absent rather than crashing
// the app - see `lib/cardRepository.ts`.
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

// ─── Persisted Card ───────────────────────────────────────
// A full, self-contained snapshot of one bingo card - everything needed to
// restore it exactly as the user left it. This is the unit the persistence
// port reads/writes; the UI never touches storage directly.
export interface BingoCard {
  id: string;
  name: string; // user-facing, unique-by-construction default (US6)
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp, bumped on every autosave
  schemaVersion: number;
  cells: Cell[]; // 25 cells (flat, row-major)
  completedBingos: number[]; // indices of completed bingo lines (0-11)
}

// ─── Application State ────────────────────────────────────
// The card collection is the source of truth; the board renders whichever
// card is `activeCardId`. Only one member is reachable from the UI in this
// slice, but the shape supports many (sidebar/multi-card slices land later).
export interface AppState {
  // Phase 1: Goal entry (transient - not yet a persisted card)
  goals: string[]; // 0–24 goals entered so far

  // Phase 2+: Card collection
  cards: Record<string, BingoCard>;
  cardOrder: string[]; // insertion order of card ids
  activeCardId: string | null;

  // Phase 3: Bingo tracking (transient, not persisted)
  newBingos: number[]; // lines completed by the LAST toggle only (animation trigger)

  // True once the collection has been rehydrated from the repository (or
  // rehydration has been attempted and found nothing). Gates autosave so we
  // never overwrite persisted data with the initial empty state.
  hydrated: boolean;
}

// ─── Actions ──────────────────────────────────────────────
export type AppAction =
  | { type: "ADD_GOAL"; goal: string }
  | { type: "REMOVE_GOAL"; index: number }
  | { type: "GENERATE_CARD" }
  | { type: "TOGGLE_COMPLETION"; cellIndex: number }
  | { type: "UPDATE_NOTES"; cellIndex: number; notes: string }
  | { type: "UPDATE_GOAL_TITLE"; cellIndex: number; title: string }
  | { type: "REHYDRATE"; cards: BingoCard[]; activeCardId: string | null }
  | { type: "RESET" };

// ─── Persistence Port ──────────────────────────────────────
// Async by contract from day one, even though the current backing
// (localStorage) is synchronous - a future API/DB backend is a pure
// implementation swap behind this same interface.
export interface CardRepository {
  list(): Promise<BingoCard[]>;
  load(id: string): Promise<BingoCard | null>;
  save(card: BingoCard): Promise<void>;
  delete(id: string): Promise<void>;
  getActiveCardId(): Promise<string | null>;
  setActiveCardId(id: string | null): Promise<void>;
}

// Minimal surface of the Web Storage API the repository depends on, so tests
// can supply an in-memory fake instead of a real `localStorage`.
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

// On-disk shape written to a single storage key.
export interface PersistedCollection {
  schemaVersion: number;
  activeCardId: string | null;
  cards: BingoCard[];
}
