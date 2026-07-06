/**
 * localStorage-backed implementation of the CardRepository port.
 *
 * SSR-safe: `window`/`localStorage` do not exist during server render, so
 * every method falls back to a safe no-op/empty-result instead of throwing.
 * Storage is swappable via `storageOverride` so tests can exercise the same
 * contract against an in-memory backing.
 */
import {
  CURRENT_SCHEMA_VERSION,
  type CardRepository,
  type PersistedCard,
} from "@/lib/types";

const CARDS_KEY = "bingogen.cards.v1";
const ACTIVE_CARD_KEY = "bingogen.activeCardId.v1";

/** Minimal surface of the Web Storage API this repository depends on. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Raised when a write fails for a reason other than storage being
 * unavailable (e.g. `QuotaExceededError`), so callers can surface the
 * failure instead of it being silently dropped.
 */
export class RepositoryWriteError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "RepositoryWriteError";
  }
}

function getBrowserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    // Some browsers (e.g. Safari private mode) throw on access.
    return null;
  }
}

function isPersistedCard(value: unknown): value is PersistedCard {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    typeof v.createdAt === "string" &&
    typeof v.updatedAt === "string" &&
    typeof v.schemaVersion === "number" &&
    Array.isArray(v.goals) &&
    Array.isArray(v.cells) &&
    typeof v.cardGenerated === "boolean" &&
    Array.isArray(v.completedBingos)
  );
}

/**
 * Reads and validates stored cards. Malformed entries, or entries whose
 * schemaVersion is missing/older than current, are dropped rather than
 * trusted - this is what keeps a stale or corrupted store from crashing
 * the app.
 */
function readCards(storage: StorageLike): PersistedCard[] {
  const raw = storage.getItem(CARDS_KEY);
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed.filter(
    (entry): entry is PersistedCard =>
      isPersistedCard(entry) && entry.schemaVersion === CURRENT_SCHEMA_VERSION,
  );
}

function writeCards(storage: StorageLike, cards: PersistedCard[]): void {
  try {
    storage.setItem(CARDS_KEY, JSON.stringify(cards));
  } catch (err) {
    const isQuotaError =
      (err instanceof DOMException &&
        (err.name === "QuotaExceededError" ||
          err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
          err.code === 22 ||
          err.code === 1014)) ||
      (err instanceof Error && err.name === "QuotaExceededError");

    throw new RepositoryWriteError(
      isQuotaError
        ? "Storage quota exceeded - could not save card."
        : "Failed to save card.",
      err,
    );
  }
}

/**
 * Creates a CardRepository backed by localStorage (or `storageOverride`,
 * e.g. an in-memory Map-backed StorageLike for tests).
 */
export function createLocalStorageCardRepository(
  storageOverride?: StorageLike,
): CardRepository {
  function getStorage(): StorageLike | null {
    return storageOverride ?? getBrowserStorage();
  }

  return {
    async list() {
      const storage = getStorage();
      if (!storage) return [];
      return readCards(storage);
    },

    async load(id) {
      const storage = getStorage();
      if (!storage) return null;
      return readCards(storage).find((card) => card.id === id) ?? null;
    },

    async save(card) {
      const storage = getStorage();
      if (!storage) return; // SSR / storage unavailable: no-op, never throw
      const cards = readCards(storage);
      const idx = cards.findIndex((c) => c.id === card.id);
      if (idx >= 0) {
        cards[idx] = card;
      } else {
        cards.push(card);
      }
      writeCards(storage, cards);
    },

    async delete(id) {
      const storage = getStorage();
      if (!storage) return;
      const cards = readCards(storage).filter((c) => c.id !== id);
      writeCards(storage, cards);
    },

    async loadActiveId() {
      const storage = getStorage();
      if (!storage) return null;
      return storage.getItem(ACTIVE_CARD_KEY);
    },

    async saveActiveId(id) {
      const storage = getStorage();
      if (!storage) return;
      if (id === null) {
        storage.removeItem(ACTIVE_CARD_KEY);
      } else {
        storage.setItem(ACTIVE_CARD_KEY, id);
      }
    },
  };
}

/** In-memory StorageLike, useful for tests and as a reference implementation. */
export function createInMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}
