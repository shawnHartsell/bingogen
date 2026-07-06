import { describe, expect, it } from "vitest";
import {
  createInMemoryStorage,
  createLocalStorageCardRepository,
  RepositoryWriteError,
  type StorageLike,
} from "@/lib/cardRepository";
import { CURRENT_SCHEMA_VERSION, type PersistedCard } from "@/lib/types";

function makeCard(overrides: Partial<PersistedCard> = {}): PersistedCard {
  return {
    id: "card-1",
    name: "Card - Jul 6, 12:03",
    createdAt: "2026-07-06T12:03:00.000Z",
    updatedAt: "2026-07-06T12:03:00.000Z",
    schemaVersion: CURRENT_SCHEMA_VERSION,
    goals: Array.from({ length: 24 }, (_, i) => `Goal ${i}`),
    cells: [],
    cardGenerated: true,
    completedBingos: [],
    ...overrides,
  };
}

describe("createLocalStorageCardRepository (in-memory backing)", () => {
  it("returns an empty list when nothing has been saved", async () => {
    const repo = createLocalStorageCardRepository(createInMemoryStorage());
    await expect(repo.list()).resolves.toEqual([]);
    await expect(repo.load("missing")).resolves.toBeNull();
    await expect(repo.loadActiveId()).resolves.toBeNull();
  });

  it("saves and lists cards, preserving full snapshot fidelity", async () => {
    const repo = createLocalStorageCardRepository(createInMemoryStorage());
    const card = makeCard({
      cells: [
        {
          row: 0,
          col: 0,
          goalTitle: "Run a marathon",
          isFreeSpace: false,
          isCompleted: true,
          notes: "Finished! *so proud*",
        },
      ],
      completedBingos: [0, 5],
    });

    await repo.save(card);

    const listed = await repo.list();
    expect(listed).toHaveLength(1);
    expect(listed[0]).toEqual(card);

    const loaded = await repo.load(card.id);
    expect(loaded).toEqual(card);
  });

  it("upserts on save rather than duplicating", async () => {
    const repo = createLocalStorageCardRepository(createInMemoryStorage());
    const card = makeCard();
    await repo.save(card);

    const updated: PersistedCard = { ...card, name: "Renamed" };
    await repo.save(updated);

    const listed = await repo.list();
    expect(listed).toHaveLength(1);
    expect(listed[0].name).toBe("Renamed");
  });

  it("deletes a card by id", async () => {
    const repo = createLocalStorageCardRepository(createInMemoryStorage());
    const card = makeCard();
    await repo.save(card);
    await repo.delete(card.id);

    await expect(repo.list()).resolves.toEqual([]);
    await expect(repo.load(card.id)).resolves.toBeNull();
  });

  it("persists and clears the active card id", async () => {
    const repo = createLocalStorageCardRepository(createInMemoryStorage());
    await repo.saveActiveId("card-1");
    await expect(repo.loadActiveId()).resolves.toBe("card-1");

    await repo.saveActiveId(null);
    await expect(repo.loadActiveId()).resolves.toBeNull();
  });

  it("drops entries with a missing schemaVersion instead of crashing", async () => {
    const storage = createInMemoryStorage();
    const malformed = { ...makeCard(), schemaVersion: undefined };
    storage.setItem(
      "bingogen.cards.v1",
      JSON.stringify([malformed, makeCard({ id: "card-2" })]),
    );

    const repo = createLocalStorageCardRepository(storage);
    const listed = await repo.list();
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe("card-2");
  });

  it("drops entries with an older schemaVersion instead of crashing", async () => {
    const storage = createInMemoryStorage();
    const stale = makeCard({ id: "card-old", schemaVersion: 0 });
    storage.setItem(
      "bingogen.cards.v1",
      JSON.stringify([stale, makeCard({ id: "card-current" })]),
    );

    const repo = createLocalStorageCardRepository(storage);
    const listed = await repo.list();
    expect(listed.map((c) => c.id)).toEqual(["card-current"]);
  });

  it("ignores unparsable JSON in the store instead of crashing", async () => {
    const storage = createInMemoryStorage();
    storage.setItem("bingogen.cards.v1", "{ not valid json");

    const repo = createLocalStorageCardRepository(storage);
    await expect(repo.list()).resolves.toEqual([]);
  });

  it("surfaces a quota-exceeded write failure through the port", async () => {
    const quotaError = new DOMException(
      "quota exceeded",
      "QuotaExceededError",
    );
    const failingStorage: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw quotaError;
      },
      removeItem: () => {},
    };

    const repo = createLocalStorageCardRepository(failingStorage);
    await expect(repo.save(makeCard())).rejects.toBeInstanceOf(
      RepositoryWriteError,
    );
  });

  it("is SSR-safe: no window/localStorage does not throw", async () => {
    // No storageOverride and (in this Node/vitest test environment) no
    // `window` global - simulates server render.
    const repo = createLocalStorageCardRepository();

    await expect(repo.list()).resolves.toEqual([]);
    await expect(repo.load("any")).resolves.toBeNull();
    await expect(repo.loadActiveId()).resolves.toBeNull();
    await expect(repo.save(makeCard())).resolves.toBeUndefined();
    await expect(repo.delete("any")).resolves.toBeUndefined();
    await expect(repo.saveActiveId("any")).resolves.toBeUndefined();
  });
});
