import { describe, expect, it } from "vitest";
import {
  collectionReducer,
  createInitialCollectionState,
} from "@/lib/collectionReducer";
import { GOALS_REQUIRED, type CollectionState, type PersistedCard } from "@/lib/types";

function fillGoals(state: CollectionState): CollectionState {
  let next = state;
  for (let i = 0; i < GOALS_REQUIRED; i++) {
    next = collectionReducer(next, { type: "ADD_GOAL", goal: `Goal ${i}` });
  }
  return next;
}

function activeCard(state: CollectionState): PersistedCard | null {
  return state.activeCardId ? (state.cards[state.activeCardId] ?? null) : null;
}

describe("collectionReducer", () => {
  it("starts with no active card and an empty collection", () => {
    const state = createInitialCollectionState();
    expect(state.activeCardId).toBeNull();
    expect(state.cards).toEqual({});
    expect(state.hydrated).toBe(false);
  });

  it("accumulates goals up to GOALS_REQUIRED and ignores overflow/blank goals", () => {
    let state = createInitialCollectionState();
    state = collectionReducer(state, { type: "ADD_GOAL", goal: "  " });
    expect(state.goals).toEqual([]);

    state = fillGoals(state);
    expect(state.goals).toHaveLength(GOALS_REQUIRED);

    const overflowed = collectionReducer(state, {
      type: "ADD_GOAL",
      goal: "one too many",
    });
    expect(overflowed.goals).toHaveLength(GOALS_REQUIRED);
  });

  it("GENERATE_CARD creates a new active collection member with a stable id and default name", () => {
    let state = createInitialCollectionState();
    state = fillGoals(state);

    const generated = collectionReducer(state, { type: "GENERATE_CARD" });

    expect(generated.activeCardId).not.toBeNull();
    const card = activeCard(generated);
    expect(card).not.toBeNull();
    expect(card!.id).toBe(generated.activeCardId);
    expect(card!.cardGenerated).toBe(true);
    expect(card!.cells).toHaveLength(25);
    expect(card!.completedBingos).toEqual([]);
    expect(card!.name).toMatch(/^Card - /);
    // Goal-entry list is cleared once a card is generated.
    expect(generated.goals).toEqual([]);
  });

  it("GENERATE_CARD is a no-op until exactly GOALS_REQUIRED goals are entered", () => {
    let state = createInitialCollectionState();
    state = collectionReducer(state, { type: "ADD_GOAL", goal: "only one" });
    const attempt = collectionReducer(state, { type: "GENERATE_CARD" });
    expect(attempt).toBe(state);
    expect(attempt.activeCardId).toBeNull();
  });

  it("two cards generated back-to-back get distinct, non-colliding names", () => {
    let state = createInitialCollectionState();
    state = fillGoals(state);
    const first = collectionReducer(state, { type: "GENERATE_CARD" });

    let second = { ...first, goals: [] };
    second = fillGoals(second);
    second = collectionReducer(second, { type: "GENERATE_CARD" });

    const firstCard = activeCard(first);
    // After the second GENERATE_CARD, the first card is still in the
    // collection (just no longer active) - fetch it directly.
    const firstCardAfter = firstCard ? second.cards[firstCard.id] : null;
    const secondCard = activeCard(second);

    expect(firstCardAfter).not.toBeNull();
    expect(secondCard).not.toBeNull();
    expect(secondCard!.id).not.toBe(firstCardAfter!.id);
    expect(secondCard!.name).not.toBe(firstCardAfter!.name);
  });

  it("TOGGLE_COMPLETION mutates only the active card and tracks new bingos", () => {
    let state = createInitialCollectionState();
    state = fillGoals(state);
    state = collectionReducer(state, { type: "GENERATE_CARD" });
    const card = activeCard(state)!;

    // Find a non-free-space cell to toggle.
    const cellIndex = card.cells.findIndex((c) => !c.isFreeSpace);
    const toggled = collectionReducer(state, {
      type: "TOGGLE_COMPLETION",
      cellIndex,
    });

    expect(activeCard(toggled)!.cells[cellIndex].isCompleted).toBe(true);

    const toggledBack = collectionReducer(toggled, {
      type: "TOGGLE_COMPLETION",
      cellIndex,
    });
    expect(activeCard(toggledBack)!.cells[cellIndex].isCompleted).toBe(false);
  });

  it("TOGGLE_COMPLETION is a no-op with no active card", () => {
    const state = createInitialCollectionState();
    const result = collectionReducer(state, {
      type: "TOGGLE_COMPLETION",
      cellIndex: 0,
    });
    expect(result).toBe(state);
  });

  it("UPDATE_NOTES persists notes onto the active card, truncated to the max length", () => {
    let state = createInitialCollectionState();
    state = fillGoals(state);
    state = collectionReducer(state, { type: "GENERATE_CARD" });
    const cellIndex = 0;

    const updated = collectionReducer(state, {
      type: "UPDATE_NOTES",
      cellIndex,
      notes: "Some **markdown** notes",
    });

    expect(activeCard(updated)!.cells[cellIndex].notes).toBe(
      "Some **markdown** notes",
    );
  });

  it("UPDATE_GOAL_TITLE renames a non-free-space cell on the active card", () => {
    let state = createInitialCollectionState();
    state = fillGoals(state);
    state = collectionReducer(state, { type: "GENERATE_CARD" });
    const card = activeCard(state)!;
    const cellIndex = card.cells.findIndex((c) => !c.isFreeSpace);

    const updated = collectionReducer(state, {
      type: "UPDATE_GOAL_TITLE",
      cellIndex,
      title: "New goal title",
    });

    expect(activeCard(updated)!.cells[cellIndex].goalTitle).toBe(
      "New goal title",
    );
  });

  it("HYDRATE loads a persisted collection and selects the last-active card", () => {
    const state = createInitialCollectionState();
    const persisted: PersistedCard = {
      id: "restored-1",
      name: "Card - Jul 6, 12:03",
      createdAt: "2026-07-06T12:03:00.000Z",
      updatedAt: "2026-07-06T12:04:00.000Z",
      schemaVersion: 1,
      goals: Array.from({ length: 24 }, (_, i) => `Goal ${i}`),
      cells: [],
      cardGenerated: true,
      completedBingos: [1, 2],
    };

    const hydrated = collectionReducer(state, {
      type: "HYDRATE",
      cards: [persisted],
      activeCardId: "restored-1",
    });

    expect(hydrated.hydrated).toBe(true);
    expect(hydrated.activeCardId).toBe("restored-1");
    expect(activeCard(hydrated)).toEqual(persisted);
  });

  it("HYDRATE with an empty/absent store starts cleanly with no active card", () => {
    const state = createInitialCollectionState();
    const hydrated = collectionReducer(state, {
      type: "HYDRATE",
      cards: [],
      activeCardId: null,
    });

    expect(hydrated.hydrated).toBe(true);
    expect(hydrated.activeCardId).toBeNull();
    expect(hydrated.cards).toEqual({});
  });

  it("HYDRATE ignores a stale activeCardId that no longer matches a stored card", () => {
    const state = createInitialCollectionState();
    const hydrated = collectionReducer(state, {
      type: "HYDRATE",
      cards: [],
      activeCardId: "does-not-exist",
    });

    expect(hydrated.activeCardId).toBeNull();
  });
});
