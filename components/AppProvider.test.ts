import { describe, expect, it } from "vitest";
import { appReducer, getActiveCard } from "@/components/AppProvider";
import { GOALS_REQUIRED, type AppState, type BingoCard } from "@/lib/types";

function emptyState(): AppState {
  return {
    goals: [],
    cards: {},
    activeCardId: null,
    newBingos: [],
    hydrated: false,
  };
}

function fillGoals(state: AppState): AppState {
  let next = state;
  for (let i = 0; i < GOALS_REQUIRED; i++) {
    next = appReducer(next, { type: "ADD_GOAL", goal: `Goal ${i}` });
  }
  return next;
}

describe("appReducer collection model", () => {
  it("GENERATE_CARD creates a new active collection member once 24 goals are entered", () => {
    const withGoals = fillGoals(emptyState());
    const state = appReducer(withGoals, { type: "GENERATE_CARD" });

    expect(state.activeCardId).not.toBeNull();
    expect(Object.keys(state.cards)).toHaveLength(1);

    const active = getActiveCard(state);
    expect(active).not.toBeNull();
    expect(active!.id).toBe(state.activeCardId);
    expect(active!.cells).toHaveLength(25);
    expect(active!.completedBingos).toEqual([]);
    expect(active!.schemaVersion).toBeGreaterThan(0);
    expect(active!.name).toMatch(/^Card - /);
    expect(active!.createdAt).toBe(active!.updatedAt);
  });

  it("does not generate a card until exactly 24 goals are entered", () => {
    let state = emptyState();
    for (let i = 0; i < GOALS_REQUIRED - 1; i++) {
      state = appReducer(state, { type: "ADD_GOAL", goal: `Goal ${i}` });
    }
    const afterGenerate = appReducer(state, { type: "GENERATE_CARD" });
    expect(afterGenerate.activeCardId).toBeNull();
    expect(Object.keys(afterGenerate.cards)).toHaveLength(0);
  });

  it("assigns unique ids across multiple generated cards", () => {
    const withGoals = fillGoals(emptyState());
    const first = appReducer(withGoals, { type: "GENERATE_CARD" });
    const second = appReducer(fillGoals(first), { type: "GENERATE_CARD" });

    expect(Object.keys(second.cards)).toHaveLength(2);
    expect(second.activeCardId).not.toBe(first.activeCardId);
  });

  it("TOGGLE_COMPLETION mutates only the active card and recomputes bingos", () => {
    const withGoals = fillGoals(emptyState());
    const generated = appReducer(withGoals, { type: "GENERATE_CARD" });
    const activeId = generated.activeCardId!;

    // Complete an entire row (row 0: cells 0-4) to trigger a bingo line.
    let state = generated;
    for (let i = 0; i < 5; i++) {
      state = appReducer(state, { type: "TOGGLE_COMPLETION", cellIndex: i });
    }

    const active = getActiveCard(state)!;
    expect(active.id).toBe(activeId);
    expect(active.completedBingos).toContain(0);
    expect(state.newBingos).toContain(0);
  });

  it("TOGGLE_COMPLETION is a no-op on the free space cell", () => {
    const withGoals = fillGoals(emptyState());
    const generated = appReducer(withGoals, { type: "GENERATE_CARD" });
    const freeSpaceIndex = 12;

    const state = appReducer(generated, {
      type: "TOGGLE_COMPLETION",
      cellIndex: freeSpaceIndex,
    });

    expect(getActiveCard(state)).toEqual(getActiveCard(generated));
  });

  it("UPDATE_NOTES persists notes onto the active card only", () => {
    const withGoals = fillGoals(emptyState());
    const generated = appReducer(withGoals, { type: "GENERATE_CARD" });

    const state = appReducer(generated, {
      type: "UPDATE_NOTES",
      cellIndex: 1,
      notes: "Some progress notes",
    });

    expect(getActiveCard(state)!.cells[1].notes).toBe("Some progress notes");
  });

  it("HYDRATE loads a persisted collection and restores the active card", () => {
    const card: BingoCard = {
      id: "restored-1",
      name: "Card - Jul 6, 12:03:45 PM",
      cells: [],
      completedBingos: [],
      createdAt: "2026-07-06T12:03:45.000Z",
      updatedAt: "2026-07-06T12:03:45.000Z",
      schemaVersion: 1,
    };

    const state = appReducer(emptyState(), {
      type: "HYDRATE",
      cards: [card],
      activeCardId: "restored-1",
    });

    expect(state.hydrated).toBe(true);
    expect(state.activeCardId).toBe("restored-1");
    expect(getActiveCard(state)).toEqual(card);
  });

  it("HYDRATE with an empty/absent store starts cleanly with no active card", () => {
    const state = appReducer(emptyState(), {
      type: "HYDRATE",
      cards: [],
      activeCardId: null,
    });

    expect(state.hydrated).toBe(true);
    expect(state.activeCardId).toBeNull();
    expect(getActiveCard(state)).toBeNull();
  });

  it("HYDRATE ignores a dangling activeCardId that has no matching card", () => {
    const state = appReducer(emptyState(), {
      type: "HYDRATE",
      cards: [],
      activeCardId: "does-not-exist",
    });

    expect(state.activeCardId).toBeNull();
  });
});
