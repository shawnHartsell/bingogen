import { describe, it, expect, vi } from "vitest";
import { createLocalStorageCardRepository } from "@/lib/cardRepository";
import { createInMemoryStorage } from "@/lib/testUtils/inMemoryStorage";
import { CURRENT_SCHEMA_VERSION, TOTAL_CELLS, type PersistedCard } from "@/lib/types";

function makeCard(overrides: Partial<PersistedCard> = {}): PersistedCard {
  const cells = Array.from({ length: TOTAL_CELLS }, (_, i) => ({
    row: Math.floor(i / 5),
    col: i % 5,
    goalTitle: i === 12 ? "FREE" : `Goal ${i}`,
    isFreeSpace: i === 12,
    isCompleted: i === 12,
    notes: "",
  }));

  return {
    id: "card-1",
    name: "Card - Jul 6, 12:03",
    createdAt: "2026-07-06T12:03:00.000Z",
    updatedAt: "2026-07-06T12:03:00.000Z",
    schemaVersion: CURRENT_SCHEMA_VERSION,
    cells,
    completedBingos: [],
    ...overrides,
  };
}

describe("createLocalStorageCardRepository (in-memory backing)", () => {
  it("save/list/load round-trips a card with full snapshot fidelity", async () => {
    const repo = createLocalStorageCardRepository(createInMemoryStorage());
    const card = makeCard({ completedBingos: [0, 5] });
    card.cells[0] = { ...card.cells[0], isCompleted: true, notes: "hi" };

    await repo.save(card);

    const loaded = await repo.load(card.id);
    expect(loaded).toEqual(card);

    const listed = await repo.list();
    expect(listed).toEqual([card]);
  });

  it("returns null from load() for an unknown id", async () => {
    const repo = createLocalStorageCardRepository(createInMemoryStorage());
    expect(await repo.load("nope")).toBeNull();
  });

  it("delete() removes a card and clears activeCardId if it pointed there", async () => {
    const repo = createLocalStorageCardRepository(createInMemoryStorage());
    const card = makeCard();
    await repo.save(card);
    await repo.setActiveCardId(card.id);

    await repo.delete(card.id);

    expect(await repo.load(card.id)).toBeNull();
    expect(await repo.list()).toEqual([]);
    expect(await repo.getActiveCardId()).toBeNull();
  });

  it("persists and reads back the active card id", async () => {
    const repo = createLocalStorageCardRepository(createInMemoryStorage());
    expect(await repo.getActiveCardId()).toBeNull();

    await repo.setActiveCardId("card-1");
    expect(await repo.getActiveCardId()).toBe("card-1");

    await repo.setActiveCardId(null);
    expect(await repo.getActiveCardId()).toBeNull();
  });

  it("treats malformed JSON in storage as absent rather than crashing", async () => {
    const storage = createInMemoryStorage();
    storage.setItem("bingogen.cards", "{ not valid json");
    const repo = createLocalStorageCardRepository(storage);

    expect(await repo.list()).toEqual([]);
    expect(await repo.getActiveCardId()).toBeNull();
  });

  it("treats a payload with a missing schemaVersion as absent", async () => {
    const storage = createInMemoryStorage();
    storage.setItem(
      "bingogen.cards",
      JSON.stringify({ activeCardId: "card-1", cards: { "card-1": makeCard() } }),
    );
    const repo = createLocalStorageCardRepository(storage);

    expect(await repo.list()).toEqual([]);
  });

  it("treats a payload with an older schemaVersion as absent, without throwing", async () => {
    const storage = createInMemoryStorage();
    storage.setItem(
      "bingogen.cards",
      JSON.stringify({
        schemaVersion: CURRENT_SCHEMA_VERSION - 1,
        activeCardId: "card-1",
        cards: { "card-1": makeCard() },
      }),
    );
    const repo = createLocalStorageCardRepository(storage);

    await expect(repo.list()).resolves.toEqual([]);
    await expect(repo.getActiveCardId()).resolves.toBeNull();
  });

  it("rejects a save that exceeds storage quota instead of dropping it silently", async () => {
    const storage = createInMemoryStorage();
    const quotaError = new DOMException("quota exceeded", "QuotaExceededError");
    vi.spyOn(storage, "setItem").mockImplementation(() => {
      throw quotaError;
    });
    const repo = createLocalStorageCardRepository(storage);

    await expect(repo.save(makeCard())).rejects.toThrow(/quota/i);
  });

  it("is SSR-safe: resolves with empty/no-op results when there is no backing storage", async () => {
    const repo = createLocalStorageCardRepository(undefined);

    await expect(repo.list()).resolves.toEqual([]);
    await expect(repo.load("card-1")).resolves.toBeNull();
    await expect(repo.getActiveCardId()).resolves.toBeNull();
    await expect(repo.save(makeCard())).resolves.toBeUndefined();
    await expect(repo.setActiveCardId("card-1")).resolves.toBeUndefined();
    await expect(repo.delete("card-1")).resolves.toBeUndefined();
  });
});
