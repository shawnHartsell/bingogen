import { describe, it, expect, beforeEach } from "vitest";
import {
  createLocalStorageCardRepository,
  type StorageLike,
} from "./cardRepository";
import { CARD_SCHEMA_VERSION, type BingoCard } from "./types";

/** Simple in-memory Storage-like backing for testing the repository contract. */
function createMemoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

function makeCard(overrides: Partial<BingoCard> = {}): BingoCard {
  const now = new Date().toISOString();
  return {
    id: "card-1",
    name: "Card - Jul 6, 12:00",
    cells: [
      {
        row: 0,
        col: 0,
        goalTitle: "Run a 5k",
        isFreeSpace: false,
        isCompleted: false,
        notes: "",
      },
    ],
    completedBingos: [],
    createdAt: now,
    updatedAt: now,
    schemaVersion: CARD_SCHEMA_VERSION,
    ...overrides,
  };
}

describe("localStorage-backed CardRepository", () => {
  let storage: ReturnType<typeof createMemoryStorage>;

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  it("returns an empty list when nothing has been saved", async () => {
    const repo = createLocalStorageCardRepository(storage);
    expect(await repo.listCards()).toEqual([]);
  });

  it("saves and loads a card with full snapshot fidelity", async () => {
    const repo = createLocalStorageCardRepository(storage);
    const card = makeCard({
      cells: [
        {
          row: 0,
          col: 0,
          goalTitle: "Read 12 books",
          isFreeSpace: false,
          isCompleted: true,
          notes: "## Progress\n- Book 1 done",
        },
      ],
      completedBingos: [0, 5],
    });

    await repo.saveCard(card);
    const loaded = await repo.loadCard(card.id);

    expect(loaded).toEqual(card);
  });

  it("lists all saved cards", async () => {
    const repo = createLocalStorageCardRepository(storage);
    const a = makeCard({ id: "a" });
    const b = makeCard({ id: "b" });
    await repo.saveCard(a);
    await repo.saveCard(b);

    const all = await repo.listCards();
    expect(all.map((c) => c.id).sort()).toEqual(["a", "b"]);
  });

  it("overwrites an existing card on save (replace, not duplicate)", async () => {
    const repo = createLocalStorageCardRepository(storage);
    const card = makeCard();
    await repo.saveCard(card);
    await repo.saveCard({ ...card, name: "Renamed" });

    const all = await repo.listCards();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe("Renamed");
  });

  it("deletes a card by id", async () => {
    const repo = createLocalStorageCardRepository(storage);
    const card = makeCard();
    await repo.saveCard(card);
    await repo.deleteCard(card.id);

    expect(await repo.listCards()).toEqual([]);
    expect(await repo.loadCard(card.id)).toBeNull();
  });

  it("persists and reads back the active card id", async () => {
    const repo = createLocalStorageCardRepository(storage);
    expect(await repo.getActiveCardId()).toBeNull();

    await repo.setActiveCardId("card-1");
    expect(await repo.getActiveCardId()).toBe("card-1");

    await repo.setActiveCardId(null);
    expect(await repo.getActiveCardId()).toBeNull();
  });

  it("ignores cards with a missing schemaVersion instead of crashing", async () => {
    storage.setItem(
      "bingogen:cards:v1",
      JSON.stringify({
        schemaVersion: CARD_SCHEMA_VERSION,
        cards: [{ id: "bad", name: "no version" }],
      }),
    );
    const repo = createLocalStorageCardRepository(storage);
    expect(await repo.listCards()).toEqual([]);
  });

  it("ignores cards with an older schemaVersion instead of crashing", async () => {
    const card = makeCard({ schemaVersion: CARD_SCHEMA_VERSION - 1 });
    storage.setItem(
      "bingogen:cards:v1",
      JSON.stringify({ schemaVersion: CARD_SCHEMA_VERSION, cards: [card] }),
    );
    const repo = createLocalStorageCardRepository(storage);
    expect(await repo.listCards()).toEqual([]);
  });

  it("treats malformed JSON as an empty store rather than throwing", async () => {
    storage.setItem("bingogen:cards:v1", "{not valid json");
    const repo = createLocalStorageCardRepository(storage);
    await expect(repo.listCards()).resolves.toEqual([]);
  });

  it("is SSR-safe: no storage available does not throw and behaves as empty", async () => {
    const repo = createLocalStorageCardRepository(null);
    await expect(repo.listCards()).resolves.toEqual([]);
    await expect(repo.loadCard("x")).resolves.toBeNull();
    await expect(repo.saveCard(makeCard())).resolves.toBeUndefined();
    await expect(repo.getActiveCardId()).resolves.toBeNull();
    await expect(repo.setActiveCardId("x")).resolves.toBeUndefined();
  });

  it("surfaces write failures (e.g. QuotaExceededError) instead of dropping them", async () => {
    const quotaStorage: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
      },
      removeItem: () => {},
    };
    const repo = createLocalStorageCardRepository(quotaStorage);
    await expect(repo.saveCard(makeCard())).rejects.toThrow();
  });
});
