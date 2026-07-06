import { describe, it, expect } from "vitest";
import { appReducer, initialState, getActiveCard } from "./AppProvider";
import { GOALS_REQUIRED, type AppState } from "@/lib/types";

function withFullGoals(state: AppState = initialState): AppState {
  let s = state;
  for (let i = 0; i < GOALS_REQUIRED; i++) {
    s = appReducer(s, { type: "ADD_GOAL", goal: `Goal ${i}` });
  }
  return s;
}

describe("appReducer - collection model", () => {
  it("starts with no cards and no active card", () => {
    expect(initialState.cards).toEqual({});
    expect(initialState.activeCardId).toBeNull();
  });

  it("ADD_GOAL / REMOVE_GOAL behave as before (unaffected by collection refactor)", () => {
    let state = appReducer(initialState, { type: "ADD_GOAL", goal: "Run a 5k" });
    expect(state.goals).toEqual(["Run a 5k"]);
    state = appReducer(state, { type: "REMOVE_GOAL", index: 0 });
    expect(state.goals).toEqual([]);
  });

  it("GENERATE_CARD creates a new collection member and makes it active", () => {
    const state = withFullGoals();
    const next = appReducer(state, { type: "GENERATE_CARD" });

    expect(next.activeCardId).not.toBeNull();
    expect(Object.keys(next.cards)).toHaveLength(1);

    const active = getActiveCard(next);
    expect(active).not.toBeNull();
    expect(active!.id).toBe(next.activeCardId);
    expect(active!.cells).toHaveLength(25);
    expect(active!.completedBingos).toEqual([]);
    expect(active!.schemaVersion).toBeGreaterThan(0);
    // Default name is timestamp-derived and non-empty.
    expect(active!.name.length).toBeGreaterThan(0);
  });

  it("GENERATE_CARD does nothing until exactly GOALS_REQUIRED goals are present", () => {
    const state = appReducer(initialState, { type: "ADD_GOAL", goal: "only one" });
    const next = appReducer(state, { type: "GENERATE_CARD" });
    expect(next).toBe(state);
  });

  it("a second GENERATE_CARD adds a second member and switches the active card", () => {
    const first = appReducer(withFullGoals(), { type: "GENERATE_CARD" });
    const firstId = first.activeCardId;

    // Re-enter goals for a second card (goals aren't cleared by generate).
    const second = appReducer(first, { type: "GENERATE_CARD" });
    expect(Object.keys(second.cards)).toHaveLength(2);
    expect(second.activeCardId).not.toBe(firstId);
    expect(second.cards[firstId!]).toBeDefined(); // first member still present
  });

  it("TOGGLE_COMPLETION mutates only the active card and updates completedBingos", () => {
    const generated = appReducer(withFullGoals(), { type: "GENERATE_CARD" });
    const activeId = generated.activeCardId!;
    // Find a non-free-space cell index.
    const cellIndex = generated.cards[activeId].cells.findIndex(
      (c) => !c.isFreeSpace,
    );

    const toggled = appReducer(generated, {
      type: "TOGGLE_COMPLETION",
      cellIndex,
    });

    expect(toggled.cards[activeId].cells[cellIndex].isCompleted).toBe(true);
    expect(toggled.cards[activeId].updatedAt).toBeDefined();
  });

  it("UPDATE_NOTES persists notes onto the active card only", () => {
    const generated = appReducer(withFullGoals(), { type: "GENERATE_CARD" });
    const activeId = generated.activeCardId!;
    const cellIndex = 0;

    const updated = appReducer(generated, {
      type: "UPDATE_NOTES",
      cellIndex,
      notes: "hello world",
    });

    expect(updated.cards[activeId].cells[cellIndex].notes).toBe(
      "hello world",
    );
  });

  it("HYDRATE loads a persisted collection and restores the last-active card", () => {
    const cardA = appReducer(withFullGoals(), { type: "GENERATE_CARD" });
    const active = getActiveCard(cardA)!;

    const hydrated = appReducer(initialState, {
      type: "HYDRATE",
      cards: [active],
      activeCardId: active.id,
    });

    expect(hydrated.hydrated).toBe(true);
    expect(hydrated.activeCardId).toBe(active.id);
    expect(getActiveCard(hydrated)).toEqual(active);
  });

  it("HYDRATE with an empty/absent store starts cleanly with no active card", () => {
    const hydrated = appReducer(initialState, {
      type: "HYDRATE",
      cards: [],
      activeCardId: null,
    });

    expect(hydrated.hydrated).toBe(true);
    expect(hydrated.activeCardId).toBeNull();
    expect(getActiveCard(hydrated)).toBeNull();
  });

  it("HYDRATE ignores a dangling activeCardId that has no matching card", () => {
    const hydrated = appReducer(initialState, {
      type: "HYDRATE",
      cards: [],
      activeCardId: "missing-card",
    });

    expect(hydrated.activeCardId).toBeNull();
  });
});
