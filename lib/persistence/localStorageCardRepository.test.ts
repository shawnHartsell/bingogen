import { describe, expect, it, vi } from "vitest";
import { CURRENT_SCHEMA_VERSION, type BingoCard } from "@/lib/types";
import {
  LocalStorageCardRepository,
  type StorageLike,
} from "@/lib/persistence/localStorageCardRepository";

// ─── In-memory Storage fake ───────────────────────────────
// Implements the subset of the `Storage` interface the repository needs,
// without touching real browser localStorage.
function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
    removeItem(key: string) {
      map.delete(key);
    },
  };
}

function makeCard(overrides: Partial<BingoCard> = {}): BingoCard {
  return {
    id: "card-1",
    name: "Card - Jul 6, 12:03:45 PM",
    cells: [],
    completedBingos: [],
    createdAt: "2026-07-06T12:03:45.000Z",
    updatedAt: "2026-07-06T12:03:45.000Z",
    schemaVersion: CURRENT_SCHEMA_VERSION,
    ...overrides,
  };
}

describe("LocalStorageCardRepository", () => {
  it("saves and loads a card with full snapshot fidelity", async () => {
    const repo = new LocalStorageCardRepository(createMemoryStorage());
    const card = makeCard({
      cells: [
        {
          row: 0,
          col: 0,
          goalTitle: "Run a 5k",
          isFreeSpace: false,
          isCompleted: true,
          notes: "Done in the park",
        },
      ],
      completedBingos: [0],
    });

    await repo.saveCard(card);
    const loaded = await repo.loadCard(card.id);

    expect(loaded).toEqual(card);
  });

  it("lists all saved cards", async () => {
    const repo = new LocalStorageCardRepository(createMemoryStorage());
    await repo.saveCard(makeCard({ id: "a" }));
    await repo.saveCard(makeCard({ id: "b" }));

    const cards = await repo.listCards();
    expect(cards.map((c) => c.id).sort()).toEqual(["a", "b"]);
  });

  it("overwrites an existing card with the same id instead of duplicating", async () => {
    const repo = new LocalStorageCardRepository(createMemoryStorage());
    await repo.saveCard(makeCard({ id: "a", name: "First" }));
    await repo.saveCard(makeCard({ id: "a", name: "Renamed" }));

    const cards = await repo.listCards();
    expect(cards).toHaveLength(1);
    expect(cards[0].name).toBe("Renamed");
  });

  it("deletes a card", async () => {
    const repo = new LocalStorageCardRepository(createMemoryStorage());
    await repo.saveCard(makeCard({ id: "a" }));
    await repo.deleteCard("a");

    expect(await repo.loadCard("a")).toBeNull();
    expect(await repo.listCards()).toEqual([]);
  });

  it("returns null for a card that was never saved", async () => {
    const repo = new LocalStorageCardRepository(createMemoryStorage());
    expect(await repo.loadCard("missing")).toBeNull();
  });

  it("tracks the active card id", async () => {
    const repo = new LocalStorageCardRepository(createMemoryStorage());
    expect(await repo.getActiveCardId()).toBeNull();

    await repo.setActiveCardId("card-1");
    expect(await repo.getActiveCardId()).toBe("card-1");

    await repo.setActiveCardId(null);
    expect(await repo.getActiveCardId()).toBeNull();
  });

  it("ignores stored cards with a missing schemaVersion", async () => {
    const storage = createMemoryStorage();
    storage.setItem(
      "bingogen:cards",
      JSON.stringify([
        {
          id: "legacy",
          name: "Legacy card",
          cells: [],
          completedBingos: [],
          createdAt: "2020-01-01T00:00:00.000Z",
          updatedAt: "2020-01-01T00:00:00.000Z",
          // schemaVersion intentionally omitted
        },
      ]),
    );
    const repo = new LocalStorageCardRepository(storage);

    expect(await repo.listCards()).toEqual([]);
    expect(await repo.loadCard("legacy")).toBeNull();
  });

  it("ignores stored cards with an older schemaVersion", async () => {
    const storage = createMemoryStorage();
    storage.setItem(
      "bingogen:cards",
      JSON.stringify([makeCard({ id: "old", schemaVersion: 0 })]),
    );
    const repo = new LocalStorageCardRepository(storage);

    expect(await repo.listCards()).toEqual([]);
  });

  it("treats malformed JSON in storage as an empty collection instead of throwing", async () => {
    const storage = createMemoryStorage();
    storage.setItem("bingogen:cards", "{not valid json");
    const repo = new LocalStorageCardRepository(storage);

    await expect(repo.listCards()).resolves.toEqual([]);
  });

  it("surfaces a write failure when storage quota is exceeded", async () => {
    const storage = createMemoryStorage();
    const quotaError = new DOMException("quota exceeded", "QuotaExceededError");
    vi.spyOn(storage, "setItem").mockImplementation(() => {
      throw quotaError;
    });
    const repo = new LocalStorageCardRepository(storage);

    await expect(repo.saveCard(makeCard())).rejects.toThrow(/quota/i);
  });

  it("is SSR-safe: does not throw when there is no window/localStorage", async () => {
    const repo = new LocalStorageCardRepository(null);

    await expect(repo.listCards()).resolves.toEqual([]);
    await expect(repo.loadCard("any")).resolves.toBeNull();
    await expect(repo.saveCard(makeCard())).resolves.toBeUndefined();
    await expect(repo.deleteCard("any")).resolves.toBeUndefined();
    await expect(repo.getActiveCardId()).resolves.toBeNull();
    await expect(repo.setActiveCardId("x")).resolves.toBeUndefined();
  });
});
