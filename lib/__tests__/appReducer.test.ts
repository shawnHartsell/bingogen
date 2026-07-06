import { describe, it, expect } from "vitest";
import { appReducer, initialState, getActiveCard } from "@/lib/appReducer";
import { GOALS_REQUIRED } from "@/lib/types";
import type { AppState } from "@/lib/types";

function fillGoals(state: AppState): AppState {
  let next = state;
  for (let i = 0; i < GOALS_REQUIRED; i++) {
    next = appReducer(next, { type: "ADD_GOAL", goal: `Goal ${i}` });
  }
  return next;
}

describe("appReducer - collection model", () => {
  it("GENERATE_CARD creates a new collection member and makes it active", () => {
    const withGoals = fillGoals(initialState);
    const next = appReducer(withGoals, { type: "GENERATE_CARD" });

    expect(next.activeCardId).not.toBeNull();
    const active = getActiveCard(next);
    expect(active).not.toBeNull();
    expect(active!.id).toBe(next.activeCardId);
    expect(active!.cells).toHaveLength(25);
    expect(active!.schemaVersion).toBeGreaterThan(0);
    expect(active!.completedBingos).toEqual([]);
    expect(Object.keys(next.cards)).toEqual([next.activeCardId]);
  });

  it("clears the draft goals once a card is generated", () => {
    const withGoals = fillGoals(initialState);
    const next = appReducer(withGoals, { type: "GENERATE_CARD" });
    expect(next.goals).toEqual([]);
  });

  it("does not generate a card until GOALS_REQUIRED goals are entered", () => {
    let state = initialState;
    for (let i = 0; i < GOALS_REQUIRED - 1; i++) {
      state = appReducer(state, { type: "ADD_GOAL", goal: `g${i}` });
    }
    const next = appReducer(state, { type: "GENERATE_CARD" });
    expect(next.activeCardId).toBeNull();
    expect(next).toBe(state);
  });

  it("gives freshly generated cards a unique, timestamp-derived default name", () => {
    const withGoals = fillGoals(initialState);
    const first = appReducer(withGoals, { type: "GENERATE_CARD" });
    expect(getActiveCard(first)!.name).toMatch(/^Card - /);
  });

  it("TOGGLE_COMPLETION mutates only the active card's cells", () => {
    const withGoals = fillGoals(initialState);
    const generated = appReducer(withGoals, { type: "GENERATE_CARD" });
    const nonFreeIndex = getActiveCard(generated)!.cells.findIndex(
      (c) => !c.isFreeSpace,
    );

    const toggled = appReducer(generated, {
      type: "TOGGLE_COMPLETION",
      cellIndex: nonFreeIndex,
    });

    expect(getActiveCard(toggled)!.cells[nonFreeIndex].isCompleted).toBe(true);
  });

  it("UPDATE_NOTES persists notes onto the active card's cell", () => {
    const withGoals = fillGoals(initialState);
    const generated = appReducer(withGoals, { type: "GENERATE_CARD" });
    const idx = 0;

    const updated = appReducer(generated, {
      type: "UPDATE_NOTES",
      cellIndex: idx,
      notes: "hello world",
    });

    expect(getActiveCard(updated)!.cells[idx].notes).toBe("hello world");
  });

  it("REHYDRATE restores the collection and selects the persisted active card", () => {
    const card = {
      id: "card-1",
      name: "Card - Jan 1, 00:00",
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
      schemaVersion: 1,
      cells: [],
      completedBingos: [],
    };

    const next = appReducer(initialState, {
      type: "REHYDRATE",
      cards: [card],
      activeCardId: "card-1",
    });

    expect(next.hydrated).toBe(true);
    expect(next.activeCardId).toBe("card-1");
    expect(getActiveCard(next)).toEqual(card);
  });

  it("REHYDRATE with an empty store starts cleanly with no active card", () => {
    const next = appReducer(initialState, {
      type: "REHYDRATE",
      cards: [],
      activeCardId: null,
    });

    expect(next.hydrated).toBe(true);
    expect(next.activeCardId).toBeNull();
    expect(getActiveCard(next)).toBeNull();
  });

  it("REHYDRATE ignores an activeCardId that doesn't match any restored card", () => {
    const next = appReducer(initialState, {
      type: "REHYDRATE",
      cards: [],
      activeCardId: "missing-card",
    });

    expect(next.activeCardId).toBeNull();
  });
});
