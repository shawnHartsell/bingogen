/**
 * Async persistence port for bingo cards, backed by `localStorage`.
 *
 * - SSR-safe: never touches `window`/`localStorage` when unavailable; every
 *   method resolves gracefully instead of throwing during a server render.
 * - Validates a `schemaVersion` stamp on read; missing/older payloads are
 *   treated as absent rather than crashing the app.
 * - Surfaces write failures (e.g. `QuotaExceededError`) by rejecting the
 *   returned promise instead of silently dropping the save.
 *
 * The UI/reducer never import this module directly for reads/writes other
 * than through the `CardRepository` interface - see `lib/types.ts`.
 */
import {
  type BingoCard,
  type CardRepository,
  type PersistedCollection,
  type StorageLike,
  CARD_SCHEMA_VERSION,
} from "@/lib/types";

const STORAGE_KEY = "bingogen.cardCollection.v1";

function getBrowserStorage(): StorageLike | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage;
  } catch {
    // Some environments (privacy mode, disabled storage) throw on access.
    return undefined;
  }
}

function isBingoCard(value: unknown): value is BingoCard {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    typeof v.createdAt === "string" &&
    typeof v.updatedAt === "string" &&
    typeof v.schemaVersion === "number" &&
    Array.isArray(v.cells) &&
    Array.isArray(v.completedBingos)
  );
}

function isValidCollection(value: unknown): value is PersistedCollection {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.schemaVersion !== "number") return false;
  if (v.schemaVersion !== CARD_SCHEMA_VERSION) return false;
  if (v.activeCardId !== null && typeof v.activeCardId !== "string")
    return false;
  if (!Array.isArray(v.cards)) return false;
  return v.cards.every(isBingoCard);
}

function emptyCollection(): PersistedCollection {
  return { schemaVersion: CARD_SCHEMA_VERSION, activeCardId: null, cards: [] };
}

export class PersistenceError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "PersistenceError";
  }
}

export class LocalStorageCardRepository implements CardRepository {
  constructor(
    private readonly getStorage: () => StorageLike | undefined = getBrowserStorage,
  ) {}

  private readCollection(): PersistedCollection {
    const storage = this.getStorage();
    if (!storage) return emptyCollection();

    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return emptyCollection();

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Corrupt payload - treat as absent rather than crash.
      return emptyCollection();
    }

    if (!isValidCollection(parsed)) {
      // Missing/older schemaVersion, or malformed shape - ignore, not throw.
      return emptyCollection();
    }

    return parsed;
  }

  private writeCollection(collection: PersistedCollection): void {
    const storage = this.getStorage();
    if (!storage) return; // SSR / storage unavailable: no-op, not a failure.

    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(collection));
    } catch (err) {
      throw new PersistenceError(
        "Failed to persist bingo card collection (storage write failed).",
        { cause: err },
      );
    }
  }

  async list(): Promise<BingoCard[]> {
    return this.readCollection().cards;
  }

  async load(id: string): Promise<BingoCard | null> {
    return this.readCollection().cards.find((c) => c.id === id) ?? null;
  }

  async save(card: BingoCard): Promise<void> {
    const collection = this.readCollection();
    const index = collection.cards.findIndex((c) => c.id === card.id);
    const cards =
      index === -1
        ? [...collection.cards, card]
        : collection.cards.map((c) => (c.id === card.id ? card : c));

    this.writeCollection({ ...collection, cards });
  }

  async delete(id: string): Promise<void> {
    const collection = this.readCollection();
    const cards = collection.cards.filter((c) => c.id !== id);
    const activeCardId =
      collection.activeCardId === id ? null : collection.activeCardId;
    this.writeCollection({ ...collection, cards, activeCardId });
  }

  async getActiveCardId(): Promise<string | null> {
    return this.readCollection().activeCardId;
  }

  async setActiveCardId(id: string | null): Promise<void> {
    const collection = this.readCollection();
    this.writeCollection({ ...collection, activeCardId: id });
  }
}

export const cardRepository: CardRepository = new LocalStorageCardRepository();
