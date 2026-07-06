import { describe, it, expect } from "vitest";
import { appReducer, initialState } from "@/lib/appReducer";
import { GOALS_REQUIRED, TOTAL_CELLS, type AppState } from "@/lib/types";

function withGoals(count = GOALS_REQUIRED): AppState {
  let state = initialState;
  for (let i = 0; i < count; i++) {
    state = appReducer(state, { type: "ADD_GOAL", goal: `Goal ${i}` });
  }
  return state;
}

describe("appReducer (pure collection reducer)", () => {
  it("ADD_GOAL accumulates trimmed goals up to GOALS_REQUIRED", () => {
    const state = appReducer(initialState, { type: "ADD_GOAL", goal: "  Read 12 books  " });
    expect(state.goals).toEqual(["Read 12 books"]);

    const full = withGoals(GOALS_REQUIRED);
    expect(full.goals).toHaveLength(GOALS_REQUIRED);

    const overflow = appReducer(full, { type: "ADD_GOAL", goal: "one too many" });
    expect(overflow.goals).toHaveLength(GOALS_REQUIRED);
  });

  it("GENERATE_CARD is a no-op until exactly GOALS_REQUIRED goals exist", () => {
    const short = withGoals(GOALS_REQUIRED - 1);
    const stillShort = appReducer(short, { type: "GENERATE_CARD" });
    expect(stillShort.cardGenerated).toBe(false);
    expect(stillShort.activeCardId).toBeNull();
  });

  it("GENERATE_CARD creates a new active collection member with a unique id and name", () => {
    const ready = withGoals();
    const generated = appReducer(ready, { type: "GENERATE_CARD" });

    expect(generated.cardGenerated).toBe(true);
    expect(generated.activeCardId).not.toBeNull();

    const activeId = generated.activeCardId!;
    const card = generated.cards[activeId];
    expect(card).toBeDefined();
    expect(card.id).toBe(activeId);
    expect(card.cells).toHaveLength(TOTAL_CELLS);
    expect(card.completedBingos).toEqual([]);
    expect(card.name).toMatch(/^Card - /);
    expect(card.schemaVersion).toBeTypeOf("number");
  });

  it("generating a second card never collides in id or name with the first", () => {
    const ready = withGoals();
    const first = appReducer(ready, { type: "GENERATE_CARD" });
    // Re-add goals so a second GENERATE_CARD is valid too.
    const readyAgain = withGoals(GOALS_REQUIRED);
    const secondSource: typeof first = { ...first, goals: readyAgain.goals };
    const second = appReducer(secondSource, { type: "GENERATE_CARD" });

    const ids = Object.keys(second.cards);
    expect(ids).toHaveLength(2);
    const [cardA, cardB] = Object.values(second.cards);
    expect(cardA.id).not.toBe(cardB.id);
    expect(cardA.name).not.toBe(cardB.name);
  });

  it("TOGGLE_COMPLETION flips a cell on the active card and tracks completed bingo lines", () => {
    const generated = appReducer(withGoals(), { type: "GENERATE_CARD" });
    const activeId = generated.activeCardId!;
    // Complete the whole top row (indices 0-4) to trigger a bingo.
    let state = generated;
    for (let i = 0; i < 5; i++) {
      state = appReducer(state, { type: "TOGGLE_COMPLETION", cellIndex: i });
    }

    const card = state.cards[activeId];
    expect(card.cells.slice(0, 5).every((c) => c.isCompleted)).toBe(true);
    expect(card.completedBingos.length).toBeGreaterThan(0);
    expect(state.newBingos.length).toBeGreaterThan(0);
  });

  it("TOGGLE_COMPLETION never toggles the free space cell", () => {
    const generated = appReducer(withGoals(), { type: "GENERATE_CARD" });
    const activeId = generated.activeCardId!;
    const freeSpaceIndex = generated.cards[activeId].cells.findIndex(
      (c) => c.isFreeSpace,
    );

    const state = appReducer(generated, {
      type: "TOGGLE_COMPLETION",
      cellIndex: freeSpaceIndex,
    });
    expect(state.cards[activeId].cells[freeSpaceIndex].isCompleted).toBe(true);
  });

  it("UPDATE_NOTES persists notes onto the active card's cell", () => {
    const generated = appReducer(withGoals(), { type: "GENERATE_CARD" });
    const activeId = generated.activeCardId!;

    const state = appReducer(generated, {
      type: "UPDATE_NOTES",
      cellIndex: 0,
      notes: "some **markdown**",
    });

    expect(state.cards[activeId].cells[0].notes).toBe("some **markdown**");
  });

  it("HYDRATE restores a persisted collection and selects the last-active card", () => {
    const generated = appReducer(withGoals(), { type: "GENERATE_CARD" });
    const activeId = generated.activeCardId!;

    // Simulate a fresh app boot: reducer starts at initialState, then hydrates.
    const rehydrated = appReducer(initialState, {
      type: "HYDRATE",
      cards: generated.cards,
      activeCardId: activeId,
    });

    expect(rehydrated.hydrated).toBe(true);
    expect(rehydrated.cardGenerated).toBe(true);
    expect(rehydrated.activeCardId).toBe(activeId);
    expect(rehydrated.cards[activeId]).toEqual(generated.cards[activeId]);
  });

  it("HYDRATE with an empty/absent store starts cleanly at goal entry", () => {
    const rehydrated = appReducer(initialState, {
      type: "HYDRATE",
      cards: {},
      activeCardId: null,
    });

    expect(rehydrated.hydrated).toBe(true);
    expect(rehydrated.cardGenerated).toBe(false);
    expect(rehydrated.activeCardId).toBeNull();
    expect(rehydrated.cards).toEqual({});
  });

  it("HYDRATE falls back to no active card if the pointed-to id isn't in the collection", () => {
    const rehydrated = appReducer(initialState, {
      type: "HYDRATE",
      cards: {},
      activeCardId: "missing-card",
    });

    expect(rehydrated.activeCardId).toBeNull();
    expect(rehydrated.cardGenerated).toBe(false);
  });
});
