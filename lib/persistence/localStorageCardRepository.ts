import {
  CURRENT_SCHEMA_VERSION,
  type BingoCard,
  type CardRepository,
} from "@/lib/types";

// ─── Storage Keys ─────────────────────────────────────────
const CARDS_KEY = "bingogen:cards";
const ACTIVE_CARD_ID_KEY = "bingogen:activeCardId";

// A `Storage`-like backing (matches the browser `Storage` interface).
// Accepting it as a parameter keeps the repository testable against an
// in-memory fake without touching real `localStorage`.
export type StorageLike = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

function getBrowserStorage(): StorageLike | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }
  return window.localStorage;
}

function isQuotaExceededError(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    // Chrome/Firefox/Safari all use different names/codes historically,
    // so check both the modern name and the legacy numeric code.
    (err.name === "QuotaExceededError" ||
      err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      err.code === 22)
  );
}

function isValidCard(value: unknown): value is BingoCard {
  if (typeof value !== "object" || value === null) return false;
  const card = value as Partial<BingoCard>;
  return (
    typeof card.id === "string" &&
    typeof card.name === "string" &&
    Array.isArray(card.cells) &&
    Array.isArray(card.completedBingos) &&
    typeof card.createdAt === "string" &&
    typeof card.updatedAt === "string" &&
    typeof card.schemaVersion === "number" &&
    card.schemaVersion >= CURRENT_SCHEMA_VERSION
  );
}

// ─── Repository ───────────────────────────────────────────
// Async localStorage-backed implementation of the CardRepository port.
// - SSR-safe: every method no-ops/resolves harmlessly when no
//   `window`/`localStorage` is available (server render).
// - Validates `schemaVersion`: malformed or older-schema entries are
//   silently dropped rather than crashing the app.
// - Surfaces write failures (e.g. `QuotaExceededError`) by rejecting the
//   returned promise instead of swallowing them.
export class LocalStorageCardRepository implements CardRepository {
  constructor(private readonly storage: StorageLike | null = getBrowserStorage()) {}

  private readAllRaw(): unknown[] {
    if (!this.storage) return [];
    const raw = this.storage.getItem(CARDS_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // Malformed JSON in storage — treat as empty rather than crashing.
      return [];
    }
  }

  private readAllValid(): BingoCard[] {
    return this.readAllRaw().filter(isValidCard);
  }

  private writeAll(cards: BingoCard[]): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(CARDS_KEY, JSON.stringify(cards));
    } catch (err) {
      if (isQuotaExceededError(err)) {
        throw new Error("Storage quota exceeded: failed to save card.");
      }
      throw err;
    }
  }

  async listCards(): Promise<BingoCard[]> {
    return this.readAllValid();
  }

  async loadCard(id: string): Promise<BingoCard | null> {
    const card = this.readAllValid().find((c) => c.id === id);
    return card ?? null;
  }

  async saveCard(card: BingoCard): Promise<void> {
    if (!this.storage) return;
    const cards = this.readAllValid();
    const index = cards.findIndex((c) => c.id === card.id);
    if (index >= 0) {
      cards[index] = card;
    } else {
      cards.push(card);
    }
    this.writeAll(cards);
  }

  async deleteCard(id: string): Promise<void> {
    if (!this.storage) return;
    const cards = this.readAllValid().filter((c) => c.id !== id);
    this.writeAll(cards);
  }

  async getActiveCardId(): Promise<string | null> {
    if (!this.storage) return null;
    return this.storage.getItem(ACTIVE_CARD_ID_KEY);
  }

  async setActiveCardId(id: string | null): Promise<void> {
    if (!this.storage) return;
    if (id === null) {
      this.storage.removeItem(ACTIVE_CARD_ID_KEY);
    } else {
      this.storage.setItem(ACTIVE_CARD_ID_KEY, id);
    }
  }
}

// Shared singleton for app code. Tests should construct their own
// `LocalStorageCardRepository` with an in-memory `StorageLike` fake
// instead of using this instance.
export const cardRepository: CardRepository = new LocalStorageCardRepository();
