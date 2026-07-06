/**
 * Async persistence port + localStorage implementation.
 *
 * The UI/state layer never touches `localStorage` directly - it only talks
 * to the `CardRepository` contract (see `lib/types.ts`). The contract is
 * Promise-based from day one even though the current backing is synchronous
 * `localStorage`, so a future API/DB-backed implementation is a pure
 * swap-in.
 *
 * Safety properties:
 * - SSR-safe: guards for an undefined `window`/`localStorage` (App Router
 *   server render) - never throws, simply behaves as an empty store.
 * - Validates a `schemaVersion` stamped on every stored card; malformed or
 *   older-schema entries are skipped (not thrown) rather than crashing the
 *   app or corrupting the whole store.
 * - Surfaces write failures (e.g. `QuotaExceededError`) by rejecting the
 *   returned promise rather than silently dropping the save.
 */
import { CARD_SCHEMA_VERSION, type BingoCard, type CardRepository } from "./types";

const STORE_KEY = "bingogen:cards:v1";
const ACTIVE_KEY = "bingogen:activeCardId:v1";

/** Minimal subset of the DOM `Storage` interface we depend on. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface StoredShape {
  schemaVersion: number;
  cards: unknown[];
}

function getBrowserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    if (typeof window.localStorage === "undefined") return null;
    return window.localStorage;
  } catch {
    // Some environments (privacy mode, disabled storage) throw on access.
    return null;
  }
}

function isCell(value: unknown): value is BingoCard["cells"][number] {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.row === "number" &&
    typeof c.col === "number" &&
    typeof c.goalTitle === "string" &&
    typeof c.isFreeSpace === "boolean" &&
    typeof c.isCompleted === "boolean" &&
    typeof c.notes === "string"
  );
}

/** Validates an unknown value as a well-formed, current-schema BingoCard. */
function isValidCard(value: unknown): value is BingoCard {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Record<string, unknown>;
  if (typeof c.id !== "string" || c.id.length === 0) return false;
  if (typeof c.name !== "string") return false;
  if (!Array.isArray(c.cells) || !c.cells.every(isCell)) return false;
  if (
    !Array.isArray(c.completedBingos) ||
    !c.completedBingos.every((n) => typeof n === "number")
  )
    return false;
  if (typeof c.createdAt !== "string") return false;
  if (typeof c.updatedAt !== "string") return false;
  if (typeof c.schemaVersion !== "number") return false;
  // Older/newer schema versions are treated as invalid for this reader;
  // a future migration step could transform them instead of dropping them.
  if (c.schemaVersion !== CARD_SCHEMA_VERSION) return false;
  return true;
}

function readStore(storage: StorageLike): BingoCard[] {
  const raw = storage.getItem(STORE_KEY);
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Corrupt JSON - treat as empty rather than crashing the app.
    return [];
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !Array.isArray((parsed as StoredShape).cards)
  ) {
    return [];
  }

  // Skip individually invalid/older-schema entries; keep the rest.
  return (parsed as StoredShape).cards.filter(isValidCard);
}

function writeStore(storage: StorageLike, cards: BingoCard[]): void {
  const payload: StoredShape = { schemaVersion: CARD_SCHEMA_VERSION, cards };
  // Let write failures (e.g. QuotaExceededError) propagate to the caller -
  // do not swallow them here.
  storage.setItem(STORE_KEY, JSON.stringify(payload));
}

/**
 * Creates a `CardRepository`. Pass an explicit `storage` (e.g. an in-memory
 * fake) for testing; omit it in app code to use `window.localStorage`,
 * falling back to a safe no-op when unavailable (SSR).
 */
export function createLocalStorageCardRepository(
  storage?: StorageLike | null,
): CardRepository {
  const resolveStorage = (): StorageLike | null =>
    storage !== undefined ? storage : getBrowserStorage();

  return {
    async listCards(): Promise<BingoCard[]> {
      const s = resolveStorage();
      if (!s) return [];
      return readStore(s);
    },

    async loadCard(id: string): Promise<BingoCard | null> {
      const s = resolveStorage();
      if (!s) return null;
      return readStore(s).find((c) => c.id === id) ?? null;
    },

    async saveCard(card: BingoCard): Promise<void> {
      const s = resolveStorage();
      if (!s) return; // SSR / no storage available: no-op, not an error.
      const cards = readStore(s);
      const index = cards.findIndex((c) => c.id === card.id);
      if (index === -1) {
        cards.push(card);
      } else {
        cards[index] = card;
      }
      writeStore(s, cards);
    },

    async deleteCard(id: string): Promise<void> {
      const s = resolveStorage();
      if (!s) return;
      const cards = readStore(s).filter((c) => c.id !== id);
      writeStore(s, cards);
    },

    async getActiveCardId(): Promise<string | null> {
      const s = resolveStorage();
      if (!s) return null;
      return s.getItem(ACTIVE_KEY);
    },

    async setActiveCardId(id: string | null): Promise<void> {
      const s = resolveStorage();
      if (!s) return;
      if (id === null) {
        s.removeItem(ACTIVE_KEY);
      } else {
        s.setItem(ACTIVE_KEY, id);
      }
    },
  };
}

/** Default, app-wide repository instance backed by `window.localStorage`. */
export const cardRepository: CardRepository = createLocalStorageCardRepository();
