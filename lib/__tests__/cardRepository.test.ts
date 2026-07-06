import { describe, it, expect, beforeEach } from "vitest";
import {
  LocalStorageCardRepository,
  PersistenceError,
} from "@/lib/cardRepository";
import type { BingoCard, StorageLike } from "@/lib/types";
import { CARD_SCHEMA_VERSION } from "@/lib/types";

/** Minimal in-memory backing implementing the `StorageLike` contract. */
class MemoryStorage implements StorageLike {
  private map = new Map<string, string>();

  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }
}

function makeCard(overrides: Partial<BingoCard> = {}): BingoCard {
  return {
    id: "card-1",
    name: "Card - Jul 6, 12:03",
    createdAt: "2026-07-06T12:03:00.000Z",
    updatedAt: "2026-07-06T12:03:00.000Z",
    schemaVersion: CARD_SCHEMA_VERSION,
    cells: [
      {
        row: 0,
        col: 0,
        goalTitle: "Run a marathon",
        isFreeSpace: false,
        isCompleted: false,
        notes: "Some **markdown** notes",
      },
    ],
    completedBingos: [],
    ...overrides,
  };
}

describe("LocalStorageCardRepository - repository contract", () => {
  let storage: MemoryStorage;
  let repo: LocalStorageCardRepository;

  beforeEach(() => {
    storage = new MemoryStorage();
    repo = new LocalStorageCardRepository(() => storage);
  });

  it("saves and loads a card with full snapshot fidelity", async () => {
    const card = makeCard();
    await repo.save(card);

    const loaded = await repo.load(card.id);
    expect(loaded).toEqual(card);
  });

  it("lists all saved cards", async () => {
    await repo.save(makeCard({ id: "a" }));
    await repo.save(makeCard({ id: "b" }));

    const list = await repo.list();
    expect(list.map((c) => c.id).sort()).toEqual(["a", "b"]);
  });

  it("updates a card in place on save with the same id", async () => {
    await repo.save(makeCard({ id: "a", name: "Original" }));
    await repo.save(makeCard({ id: "a", name: "Renamed" }));

    const list = await repo.list();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("Renamed");
  });

  it("deletes a card", async () => {
    await repo.save(makeCard({ id: "a" }));
    await repo.delete("a");

    expect(await repo.load("a")).toBeNull();
    expect(await repo.list()).toEqual([]);
  });

  it("tracks the active card id", async () => {
    expect(await repo.getActiveCardId()).toBeNull();
    await repo.setActiveCardId("card-1");
    expect(await repo.getActiveCardId()).toBe("card-1");
  });

  it("clears the active card id when the active card is deleted", async () => {
    await repo.save(makeCard({ id: "a" }));
    await repo.setActiveCardId("a");
    await repo.delete("a");
    expect(await repo.getActiveCardId()).toBeNull();
  });

  it("loading a missing card returns null instead of throwing", async () => {
    expect(await repo.load("does-not-exist")).toBeNull();
  });

  it("treats a payload with a missing schemaVersion as absent", async () => {
    storage.setItem(
      "bingogen.cardCollection.v1",
      JSON.stringify({ activeCardId: "a", cards: [makeCard({ id: "a" })] }),
    );

    expect(await repo.list()).toEqual([]);
    expect(await repo.getActiveCardId()).toBeNull();
  });

  it("treats a payload with an older schemaVersion as absent", async () => {
    storage.setItem(
      "bingogen.cardCollection.v1",
      JSON.stringify({
        schemaVersion: CARD_SCHEMA_VERSION - 1,
        activeCardId: "a",
        cards: [makeCard({ id: "a" })],
      }),
    );

    expect(await repo.list()).toEqual([]);
  });

  it("treats malformed JSON as absent rather than throwing", async () => {
    storage.setItem("bingogen.cardCollection.v1", "{not valid json");
    await expect(repo.list()).resolves.toEqual([]);
  });

  it("surfaces a write failure (e.g. quota exceeded) via a rejected promise", async () => {
    const quotaStorage: StorageLike = {
      getItem: () => null,
      setItem: () => {
        const err = new Error("QuotaExceededError");
        err.name = "QuotaExceededError";
        throw err;
      },
      removeItem: () => {},
    };
    const quotaRepo = new LocalStorageCardRepository(() => quotaStorage);

    await expect(quotaRepo.save(makeCard())).rejects.toBeInstanceOf(
      PersistenceError,
    );
  });

  it("is SSR-safe: no window/localStorage does not throw", async () => {
    const ssrRepo = new LocalStorageCardRepository(() => undefined);

    await expect(ssrRepo.list()).resolves.toEqual([]);
    await expect(ssrRepo.load("anything")).resolves.toBeNull();
    await expect(ssrRepo.getActiveCardId()).resolves.toBeNull();
    await expect(ssrRepo.save(makeCard())).resolves.toBeUndefined();
    await expect(ssrRepo.delete("anything")).resolves.toBeUndefined();
    await expect(ssrRepo.setActiveCardId("x")).resolves.toBeUndefined();
  });
});
