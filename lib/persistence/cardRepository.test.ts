import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CARD_SCHEMA_VERSION, type PersistedCard } from "./types";
import { LocalStorageCardRepository } from "./localStorageCardRepository";
import { InMemoryCardRepository } from "./inMemoryCardRepository";

const STORAGE_KEY = "bingogen:cards:v1";

function makeCard(overrides: Partial<PersistedCard> = {}): PersistedCard {
  return {
    id: "card-1",
    name: "Card - Jul 6, 12:03:45",
    createdAt: "2026-07-06T12:03:45.000Z",
    updatedAt: "2026-07-06T12:03:45.000Z",
    schemaVersion: CARD_SCHEMA_VERSION,
    cells: [],
    completedBingos: [],
    ...overrides,
  };
}

/** Minimal Storage stub so tests don't depend on jsdom. */
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe("LocalStorageCardRepository", () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("saves and loads a card by id", async () => {
    const repo = new LocalStorageCardRepository();
    const card = makeCard();

    await repo.save(card);

    await expect(repo.load(card.id)).resolves.toEqual(card);
  });

  it("returns null when loading a missing card", async () => {
    const repo = new LocalStorageCardRepository();
    await expect(repo.load("missing")).resolves.toBeNull();
  });

  it("lists all saved cards", async () => {
    const repo = new LocalStorageCardRepository();
    const a = makeCard({ id: "a" });
    const b = makeCard({ id: "b" });

    await repo.save(a);
    await repo.save(b);

    const list = await repo.list();
    expect(list).toHaveLength(2);
    expect(list.map((c) => c.id).sort()).toEqual(["a", "b"]);
  });

  it("deletes a card", async () => {
    const repo = new LocalStorageCardRepository();
    const card = makeCard();
    await repo.save(card);

    await repo.delete(card.id);

    await expect(repo.load(card.id)).resolves.toBeNull();
    await expect(repo.list()).resolves.toEqual([]);
  });

  it("clears the active card id when the active card is deleted", async () => {
    const repo = new LocalStorageCardRepository();
    const card = makeCard();
    await repo.save(card);
    await repo.setActiveCardId(card.id);

    await repo.delete(card.id);

    await expect(repo.getActiveCardId()).resolves.toBeNull();
  });

  it("round-trips the active card id", async () => {
    const repo = new LocalStorageCardRepository();
    await repo.setActiveCardId("card-42");
    await expect(repo.getActiveCardId()).resolves.toBe("card-42");
  });

  it("preserves snapshot fidelity: cells and notes survive a save/load cycle", async () => {
    const repo = new LocalStorageCardRepository();
    const card = makeCard({
      cells: [
        {
          row: 0,
          col: 0,
          goalTitle: "Run a marathon",
          isFreeSpace: false,
          isCompleted: true,
          notes: "# Done!\n\nFinished in 4h12m.",
        },
      ],
      completedBingos: [0, 5],
    });

    await repo.save(card);
    const loaded = await repo.load(card.id);

    expect(loaded).toEqual(card);
  });

  it("treats a store with no schemaVersion as empty rather than crashing", async () => {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ cards: { a: makeCard({ id: "a" }) } }),
    );
    const repo = new LocalStorageCardRepository();

    await expect(repo.list()).resolves.toEqual([]);
  });

  it("treats a store with an older schemaVersion as empty rather than crashing", async () => {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: CARD_SCHEMA_VERSION - 1,
        activeCardId: "a",
        cards: { a: makeCard({ id: "a" }) },
      }),
    );
    const repo = new LocalStorageCardRepository();

    await expect(repo.list()).resolves.toEqual([]);
    await expect(repo.getActiveCardId()).resolves.toBeNull();
  });

  it("treats malformed (non-JSON) stored data as empty rather than crashing", async () => {
    storage.setItem(STORAGE_KEY, "{not-json");
    const repo = new LocalStorageCardRepository();

    await expect(repo.list()).resolves.toEqual([]);
  });

  it("drops individual invalid card records instead of crashing", async () => {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: CARD_SCHEMA_VERSION,
        activeCardId: null,
        cards: { bad: { id: "bad" /* missing required fields */ } },
      }),
    );
    const repo = new LocalStorageCardRepository();

    await expect(repo.list()).resolves.toEqual([]);
  });

  it("surfaces a write failure (e.g. quota exceeded) rather than dropping it silently", async () => {
    const repo = new LocalStorageCardRepository();
    const quotaError = new DOMException("quota exceeded", "QuotaExceededError");
    vi.spyOn(storage, "setItem").mockImplementation(() => {
      throw quotaError;
    });

    await expect(repo.save(makeCard())).rejects.toThrow(
      /Failed to persist bingo card data/,
    );
  });

  it("is SSR-safe: no-ops instead of throwing when window is undefined", async () => {
    vi.unstubAllGlobals();
    expect(typeof window).toBe("undefined");

    const repo = new LocalStorageCardRepository();

    await expect(repo.list()).resolves.toEqual([]);
    await expect(repo.load("anything")).resolves.toBeNull();
    await expect(repo.getActiveCardId()).resolves.toBeNull();
    await expect(repo.save(makeCard())).resolves.toBeUndefined();
    await expect(repo.delete("anything")).resolves.toBeUndefined();
    await expect(repo.setActiveCardId("anything")).resolves.toBeUndefined();
  });
});

describe("InMemoryCardRepository (test double sanity check)", () => {
  it("implements the same save/list/load/delete contract", async () => {
    const repo = new InMemoryCardRepository();
    const card = makeCard();

    await repo.save(card);
    await expect(repo.load(card.id)).resolves.toEqual(card);
    await expect(repo.list()).resolves.toEqual([card]);

    await repo.delete(card.id);
    await expect(repo.load(card.id)).resolves.toBeNull();
  });
});
