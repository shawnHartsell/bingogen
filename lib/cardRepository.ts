// localStorage-backed implementation of the CardRepository port. The contract
// is async (Promise-returning) even though the backing is synchronous
// localStorage, so a future API/DB backend is a pure implementation swap.
//
// SSR-safe: when no storage is available (e.g. server render, or
// window/localStorage undefined) every method resolves with an empty/no-op
// result instead of throwing.
//
// Malformed or stale (schemaVersion mismatch) stored data is treated as
// absent rather than crashing the app. Write failures (e.g. quota exceeded)
// reject the returned promise so callers can surface them.

import {
  CURRENT_SCHEMA_VERSION,
  TOTAL_CELLS,
  type CardRepository,
  type PersistedCard,
  type StorageLike,
} from "@/lib/types";

const STORAGE_KEY = "bingogen.cards";

export class PersistenceError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "PersistenceError";
  }
}

interface StoredBlob {
  schemaVersion: number;
  activeCardId: string | null;
  cards: Record<string, PersistedCard>;
}

function emptyBlob(): StoredBlob {
  return { schemaVersion: CURRENT_SCHEMA_VERSION, activeCardId: null, cards: {} };
}

function isPersistedCard(value: unknown): value is PersistedCard {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.id === "string" &&
    typeof c.name === "string" &&
    typeof c.createdAt === "string" &&
    typeof c.updatedAt === "string" &&
    typeof c.schemaVersion === "number" &&
    Array.isArray(c.cells) &&
    c.cells.length === TOTAL_CELLS &&
    Array.isArray(c.completedBingos)
  );
}

function isStoredBlob(value: unknown): value is StoredBlob {
  if (typeof value !== "object" || value === null) return false;
  const b = value as Record<string, unknown>;
  if (typeof b.schemaVersion !== "number") return false;
  if (b.activeCardId !== null && typeof b.activeCardId !== "string")
    return false;
  if (typeof b.cards !== "object" || b.cards === null) return false;
  return Object.values(b.cards as Record<string, unknown>).every(
    isPersistedCard,
  );
}

function readBlob(storage: StorageLike | undefined): StoredBlob {
  if (!storage) return emptyBlob();
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return emptyBlob();
  }
  if (!raw) return emptyBlob();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return emptyBlob();
  }

  if (!isStoredBlob(parsed)) return emptyBlob();
  // Stale/older payloads are ignored rather than crashing the app. Future
  // migrations can branch here on parsed.schemaVersion.
  if (parsed.schemaVersion !== CURRENT_SCHEMA_VERSION) return emptyBlob();

  return parsed;
}

function isQuotaExceededError(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    (err.name === "QuotaExceededError" ||
      err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      err.code === 22 ||
      err.code === 1014)
  );
}

function writeBlob(storage: StorageLike | undefined, blob: StoredBlob): void {
  if (!storage) return; // SSR / no backing available: no-op.
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(blob));
  } catch (err) {
    if (isQuotaExceededError(err)) {
      throw new PersistenceError("Storage quota exceeded while saving card", {
        cause: err,
      });
    }
    throw err;
  }
}

/**
 * Creates a CardRepository backed by `storage` (defaults to
 * `window.localStorage` when available). Pass an in-memory StorageLike mock
 * in tests, or omit `storage` entirely for SSR-safe no-op behavior when
 * `window` is undefined.
 */
export function createLocalStorageCardRepository(
  storage?: StorageLike,
): CardRepository {
  const backing: StorageLike | undefined =
    storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);

  return {
    async list() {
      return Object.values(readBlob(backing).cards);
    },

    async load(id) {
      return readBlob(backing).cards[id] ?? null;
    },

    async save(card) {
      if (!isPersistedCard(card)) {
        throw new Error("Cannot save an invalid card payload");
      }
      const blob = readBlob(backing);
      blob.cards[card.id] = card;
      blob.schemaVersion = CURRENT_SCHEMA_VERSION;
      writeBlob(backing, blob);
    },

    async delete(id) {
      const blob = readBlob(backing);
      delete blob.cards[id];
      if (blob.activeCardId === id) blob.activeCardId = null;
      writeBlob(backing, blob);
    },

    async getActiveCardId() {
      return readBlob(backing).activeCardId;
    },

    async setActiveCardId(id) {
      const blob = readBlob(backing);
      blob.activeCardId = id;
      writeBlob(backing, blob);
    },
  };
}
