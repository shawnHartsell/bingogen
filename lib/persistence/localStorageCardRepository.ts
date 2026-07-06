import {
  CARD_SCHEMA_VERSION,
  PersistenceWriteError,
  type CardRepository,
  type PersistedCard,
} from "./types";

const STORAGE_KEY = "bingogen:cards:v1";

interface StoreShape {
  schemaVersion: number;
  activeCardId: string | null;
  cards: Record<string, PersistedCard>;
}

function emptyStore(): StoreShape {
  return { schemaVersion: CARD_SCHEMA_VERSION, activeCardId: null, cards: {} };
}

function isValidCard(value: unknown): value is PersistedCard {
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

/**
 * Reads and validates the persisted store. Malformed data, a missing
 * `schemaVersion`, or an older `schemaVersion` never crash the app - the
 * store is simply treated as empty so the app starts cleanly.
 */
function readStore(storage: Storage): StoreShape {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return emptyStore();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return emptyStore();
  }

  if (!parsed || typeof parsed !== "object") return emptyStore();
  const candidate = parsed as Record<string, unknown>;

  if (candidate.schemaVersion !== CARD_SCHEMA_VERSION) {
    // Missing or older schemaVersion: ignore rather than migrate/crash.
    return emptyStore();
  }

  const cards: Record<string, PersistedCard> = {};
  const cardsRaw = candidate.cards;
  if (cardsRaw && typeof cardsRaw === "object") {
    for (const [id, card] of Object.entries(
      cardsRaw as Record<string, unknown>,
    )) {
      if (isValidCard(card)) cards[id] = card;
    }
  }

  const activeCardId =
    typeof candidate.activeCardId === "string" ? candidate.activeCardId : null;

  return { schemaVersion: CARD_SCHEMA_VERSION, activeCardId, cards };
}

function writeStore(storage: Storage, store: StoreShape): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    // Surface write failures (e.g. QuotaExceededError) rather than silently
    // dropping the save.
    throw new PersistenceWriteError(
      "Failed to persist bingo card data",
      err,
    );
  }
}

/** SSR-safe accessor: returns null under server render or if access throws. */
function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * `localStorage`-backed implementation of {@link CardRepository}. All reads
 * and writes to `localStorage` are isolated here; the UI/state never touches
 * it directly.
 */
export class LocalStorageCardRepository implements CardRepository {
  async list(): Promise<PersistedCard[]> {
    const storage = getStorage();
    if (!storage) return [];
    return Object.values(readStore(storage).cards);
  }

  async load(id: string): Promise<PersistedCard | null> {
    const storage = getStorage();
    if (!storage) return null;
    return readStore(storage).cards[id] ?? null;
  }

  async save(card: PersistedCard): Promise<void> {
    const storage = getStorage();
    if (!storage) return; // SSR: no-op, nothing to persist to.
    const store = readStore(storage);
    store.cards[card.id] = card;
    writeStore(storage, store);
  }

  async delete(id: string): Promise<void> {
    const storage = getStorage();
    if (!storage) return;
    const store = readStore(storage);
    delete store.cards[id];
    if (store.activeCardId === id) store.activeCardId = null;
    writeStore(storage, store);
  }

  async getActiveCardId(): Promise<string | null> {
    const storage = getStorage();
    if (!storage) return null;
    return readStore(storage).activeCardId;
  }

  async setActiveCardId(id: string | null): Promise<void> {
    const storage = getStorage();
    if (!storage) return;
    const store = readStore(storage);
    store.activeCardId = id;
    writeStore(storage, store);
  }
}
