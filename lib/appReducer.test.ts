import { describe, expect, it } from "vitest";
import {
  collectionReducer,
  initialCollectionState,
  selectAppState,
  generateDefaultCardName,
} from "./appReducer";
import { GOALS_REQUIRED, type CollectionState } from "@/lib/types";

function stateWithGoals(count = GOALS_REQUIRED): CollectionState {
  let state = initialCollectionState;
  for (let i = 0; i < count; i++) {
    state = collectionReducer(state, { type: "ADD_GOAL", goal: `Goal ${i}` });
  }
  return state;
}

describe("collectionReducer", () => {
  it("ADD_GOAL accumulates trimmed goals up to the required count", () => {
    let state = initialCollectionState;
    state = collectionReducer(state, { type: "ADD_GOAL", goal: "  Read 12 books  " });
    expect(state.goals).toEqual(["Read 12 books"]);
  });

  it("ADD_GOAL ignores empty/whitespace-only goals", () => {
    const state = collectionReducer(initialCollectionState, {
      type: "ADD_GOAL",
      goal: "   ",
    });
    expect(state.goals).toEqual([]);
  });

  it("ADD_GOAL refuses goals once the required count is reached", () => {
    const full = stateWithGoals(GOALS_REQUIRED);
    const attempted = collectionReducer(full, {
      type: "ADD_GOAL",
      goal: "one too many",
    });
    expect(attempted.goals).toHaveLength(GOALS_REQUIRED);
  });

  it("GENERATE_CARD is a no-op until exactly GOALS_REQUIRED goals exist", () => {
    const partial = stateWithGoals(GOALS_REQUIRED - 1);
    const result = collectionReducer(partial, { type: "GENERATE_CARD" });
    expect(result.activeCardId).toBeNull();
    expect(Object.keys(result.cards)).toHaveLength(0);
  });

  it("GENERATE_CARD creates a new collection member and makes it active", () => {
    const ready = stateWithGoals();
    const result = collectionReducer(ready, { type: "GENERATE_CARD" });

    expect(result.activeCardId).not.toBeNull();
    const cardIds = Object.keys(result.cards);
    expect(cardIds).toHaveLength(1);
    expect(result.activeCardId).toBe(cardIds[0]);

    const active = result.cards[result.activeCardId!];
    expect(active.cells).toHaveLength(25);
    expect(active.completedBingos).toEqual([]);
    expect(active.name).toMatch(/^Card - /);
    expect(active.id).toBeTruthy();
    expect(active.createdAt).toBe(active.updatedAt);
    expect(active.schemaVersion).toBeGreaterThan(0);
  });

  it("GENERATE_CARD creates cards with distinct ids and non-colliding names across calls", () => {
    const ready = stateWithGoals();
    const first = collectionReducer(ready, { type: "GENERATE_CARD" });
    // Simulate a second generate from a fresh goal-entry (e.g. after RESET + re-entry)
    const secondReady = stateWithGoals();
    const second = collectionReducer(secondReady, { type: "GENERATE_CARD" });

    const firstCard = first.cards[first.activeCardId!];
    const secondCard = second.cards[second.activeCardId!];
    expect(firstCard.id).not.toBe(secondCard.id);
  });

  it("TOGGLE_COMPLETION only affects the active card and ignores the free space", () => {
    const ready = stateWithGoals();
    const generated = collectionReducer(ready, { type: "GENERATE_CARD" });
    const activeId = generated.activeCardId!;
    const freeSpaceIndex = generated.cards[activeId].cells.findIndex(
      (c) => c.isFreeSpace,
    );

    const afterFreeToggle = collectionReducer(generated, {
      type: "TOGGLE_COMPLETION",
      cellIndex: freeSpaceIndex,
    });
    expect(afterFreeToggle.cards[activeId].cells[freeSpaceIndex].isCompleted).toBe(
      true,
    );

    const targetIndex = freeSpaceIndex === 0 ? 1 : 0;
    const toggled = collectionReducer(generated, {
      type: "TOGGLE_COMPLETION",
      cellIndex: targetIndex,
    });
    expect(toggled.cards[activeId].cells[targetIndex].isCompleted).toBe(true);
  });

  it("TOGGLE_COMPLETION is a no-op when there is no active card", () => {
    const result = collectionReducer(initialCollectionState, {
      type: "TOGGLE_COMPLETION",
      cellIndex: 0,
    });
    expect(result).toBe(initialCollectionState);
  });

  it("UPDATE_NOTES persists notes on the active card and truncates overly long input", () => {
    const ready = stateWithGoals();
    const generated = collectionReducer(ready, { type: "GENERATE_CARD" });
    const activeId = generated.activeCardId!;

    const updated = collectionReducer(generated, {
      type: "UPDATE_NOTES",
      cellIndex: 0,
      notes: "Some **markdown** notes",
    });

    expect(updated.cards[activeId].cells[0].notes).toBe(
      "Some **markdown** notes",
    );
  });

  it("HYDRATE loads a persisted collection and selects the last-active card", () => {
    const card = {
      id: "restored-1",
      name: "Card - Jul 6, 12:03:45",
      createdAt: "2026-07-06T12:03:45.000Z",
      updatedAt: "2026-07-06T12:04:00.000Z",
      schemaVersion: 1,
      cells: [],
      completedBingos: [],
    };

    const result = collectionReducer(initialCollectionState, {
      type: "HYDRATE",
      cards: [card],
      activeCardId: "restored-1",
    });

    expect(result.activeCardId).toBe("restored-1");
    expect(result.cards["restored-1"]).toEqual(card);
  });

  it("HYDRATE falls back to no active card when the referenced id is not among the loaded cards", () => {
    const result = collectionReducer(initialCollectionState, {
      type: "HYDRATE",
      cards: [],
      activeCardId: "missing",
    });
    expect(result.activeCardId).toBeNull();
  });

  it("HYDRATE with an empty collection starts cleanly with no active card", () => {
    const result = collectionReducer(initialCollectionState, {
      type: "HYDRATE",
      cards: [],
      activeCardId: null,
    });
    expect(result.activeCardId).toBeNull();
    expect(Object.keys(result.cards)).toHaveLength(0);
  });
});

describe("selectAppState", () => {
  it("derives an empty, non-generated board view when there is no active card", () => {
    const view = selectAppState(initialCollectionState);
    expect(view.cardGenerated).toBe(false);
    expect(view.cells).toEqual([]);
    expect(view.completedBingos).toEqual([]);
  });

  it("derives the active card's board view", () => {
    const ready = stateWithGoals();
    const generated = collectionReducer(ready, { type: "GENERATE_CARD" });
    const view = selectAppState(generated);

    expect(view.cardGenerated).toBe(true);
    expect(view.cells).toHaveLength(25);
    expect(view.goals).toEqual(generated.goals);
  });
});

describe("generateDefaultCardName", () => {
  it("derives a name from the creation time", () => {
    const name = generateDefaultCardName(new Date("2026-07-06T12:03:45Z"));
    expect(name).toMatch(/^Card - /);
  });
});
