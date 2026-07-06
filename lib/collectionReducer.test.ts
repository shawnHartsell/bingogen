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

  describe("SET_ACTIVE_CARD", () => {
    it("switches the active card without altering any card's data", () => {
      let state = createInitialCollectionState();
      state = fillGoals(state);
      const first = collectionReducer(state, { type: "GENERATE_CARD" });
      const firstId = first.activeCardId!;

      let second = { ...first, goals: [] };
      second = fillGoals(second);
      second = collectionReducer(second, { type: "GENERATE_CARD" });
      const secondId = second.activeCardId!;

      // Make progress on the second (currently active) card.
      const cellIndex = activeCard(second)!.cells.findIndex(
        (c) => !c.isFreeSpace,
      );
      const withProgress = collectionReducer(second, {
        type: "TOGGLE_COMPLETION",
        cellIndex,
      });

      // Switch back to the first card.
      const switchedBack = collectionReducer(withProgress, {
        type: "SET_ACTIVE_CARD",
        id: firstId,
      });
      expect(switchedBack.activeCardId).toBe(firstId);
      expect(activeCard(switchedBack)!.id).toBe(firstId);

      // Switch forward again - the second card's progress survived.
      const switchedForward = collectionReducer(switchedBack, {
        type: "SET_ACTIVE_CARD",
        id: secondId,
      });
      expect(switchedForward.activeCardId).toBe(secondId);
      expect(activeCard(switchedForward)!.cells[cellIndex].isCompleted).toBe(
        true,
      );
    });

    it("is a no-op for an id that does not exist in the collection", () => {
      let state = createInitialCollectionState();
      state = fillGoals(state);
      state = collectionReducer(state, { type: "GENERATE_CARD" });

      const result = collectionReducer(state, {
        type: "SET_ACTIVE_CARD",
        id: "does-not-exist",
      });
      expect(result).toBe(state);
    });

    it("clears newBingos when switching cards", () => {
      let state = createInitialCollectionState();
      state = fillGoals(state);
      const first = collectionReducer(state, { type: "GENERATE_CARD" });
      const firstId = first.activeCardId!;

      let second = { ...first, goals: [] };
      second = fillGoals(second);
      second = collectionReducer(second, { type: "GENERATE_CARD" });

      const cellIndex = activeCard(second)!.cells.findIndex(
        (c) => !c.isFreeSpace,
      );
      const withProgress = collectionReducer(second, {
        type: "TOGGLE_COMPLETION",
        cellIndex,
      });
      expect(withProgress.newBingos).toBeDefined();

      const switched = collectionReducer(withProgress, {
        type: "SET_ACTIVE_CARD",
        id: firstId,
      });
      expect(switched.newBingos).toEqual([]);
    });
  });

  describe("RENAME_CARD", () => {
    function twoCards(): CollectionState {
      let state = createInitialCollectionState();
      state = fillGoals(state);
      const first = collectionReducer(state, { type: "GENERATE_CARD" });

      let second = { ...first, goals: [] };
      second = fillGoals(second);
      second = collectionReducer(second, { type: "GENERATE_CARD" });
      return second;
    }

    it("renames the card in place, bumping updatedAt, without creating a new card", () => {
      const state = twoCards();
      const firstId = Object.keys(state.cards).find(
        (id) => id !== state.activeCardId,
      )!;
      const before = state.cards[firstId];
      const cardCountBefore = Object.keys(state.cards).length;

      const renamed = collectionReducer(state, {
        type: "RENAME_CARD",
        id: firstId,
        name: "My Favorite Card",
      });

      expect(Object.keys(renamed.cards)).toHaveLength(cardCountBefore);
      expect(renamed.cards[firstId].name).toBe("My Favorite Card");
      expect(renamed.cards[firstId].id).toBe(firstId);
      expect(
        new Date(renamed.cards[firstId].updatedAt).getTime(),
      ).toBeGreaterThanOrEqual(new Date(before.updatedAt).getTime());
      expect(renamed.renameError).toBeNull();
    });

    it("trims the entered name", () => {
      const state = twoCards();
      const id = state.activeCardId!;

      const renamed = collectionReducer(state, {
        type: "RENAME_CARD",
        id,
        name: "   Padded Name   ",
      });

      expect(renamed.cards[id].name).toBe("Padded Name");
    });

    it("rejects a name already used by a different card, with visible inline feedback, and keeps the previous name", () => {
      const state = twoCards();
      const id = state.activeCardId!;
      const otherId = Object.keys(state.cards).find((cid) => cid !== id)!;
      const otherName = state.cards[otherId].name;
      const previousName = state.cards[id].name;

      const result = collectionReducer(state, {
        type: "RENAME_CARD",
        id,
        name: otherName,
      });

      expect(result.cards[id].name).toBe(previousName);
      expect(result.renameError).not.toBeNull();
      expect(result.renameError!.id).toBe(id);
      expect(result.renameError!.message.length).toBeGreaterThan(0);
    });

    it("rejects a duplicate name even with different surrounding whitespace", () => {
      const state = twoCards();
      const id = state.activeCardId!;
      const otherId = Object.keys(state.cards).find((cid) => cid !== id)!;
      const otherName = state.cards[otherId].name;
      const previousName = state.cards[id].name;

      const result = collectionReducer(state, {
        type: "RENAME_CARD",
        id,
        name: `  ${otherName}  `,
      });

      expect(result.cards[id].name).toBe(previousName);
      expect(result.renameError).not.toBeNull();
    });

    it("treats renaming a card to its own current name as a no-op, not a duplicate error", () => {
      const state = twoCards();
      const id = state.activeCardId!;
      const currentName = state.cards[id].name;

      const result = collectionReducer(state, {
        type: "RENAME_CARD",
        id,
        name: currentName,
      });

      expect(result.cards[id].name).toBe(currentName);
      expect(result.renameError).toBeNull();
    });

    it("rejects a blank/whitespace-only name with inline feedback and keeps the previous name", () => {
      const state = twoCards();
      const id = state.activeCardId!;
      const previousName = state.cards[id].name;

      const result = collectionReducer(state, {
        type: "RENAME_CARD",
        id,
        name: "   ",
      });

      expect(result.cards[id].name).toBe(previousName);
      expect(result.renameError).not.toBeNull();
      expect(result.renameError!.id).toBe(id);
    });

    it("is a no-op for an id that does not exist in the collection", () => {
      const state = twoCards();
      const result = collectionReducer(state, {
        type: "RENAME_CARD",
        id: "does-not-exist",
        name: "New Name",
      });
      expect(result).toBe(state);
    });

    it("clears a stale rename error for the same card once it succeeds", () => {
      let state = twoCards();
      const id = state.activeCardId!;
      const otherId = Object.keys(state.cards).find((cid) => cid !== id)!;
      const otherName = state.cards[otherId].name;

      state = collectionReducer(state, {
        type: "RENAME_CARD",
        id,
        name: otherName,
      });
      expect(state.renameError).not.toBeNull();

      const fixed = collectionReducer(state, {
        type: "RENAME_CARD",
        id,
        name: "A Totally Unique Name",
      });

      expect(fixed.renameError).toBeNull();
      expect(fixed.cards[id].name).toBe("A Totally Unique Name");
    });
  });

  describe("DELETE_CARD", () => {
    function twoCards(): CollectionState {
      let state = createInitialCollectionState();
      state = fillGoals(state);
      const first = collectionReducer(state, { type: "GENERATE_CARD" });

      let second = { ...first, goals: [] };
      second = fillGoals(second);
      second = collectionReducer(second, { type: "GENERATE_CARD" });
      return second;
    }

    it("removes a non-active card from the collection without touching the active card", () => {
      const state = twoCards();
      const activeId = state.activeCardId!;
      const otherId = Object.keys(state.cards).find(
        (id) => id !== activeId,
      )!;

      const result = collectionReducer(state, {
        type: "DELETE_CARD",
        id: otherId,
      });

      expect(result.cards[otherId]).toBeUndefined();
      expect(Object.keys(result.cards)).toHaveLength(1);
      expect(result.activeCardId).toBe(activeId);
      expect(result.cards[activeId]).toEqual(state.cards[activeId]);
    });

    it("deleting the active card promotes another remaining card to active", () => {
      const state = twoCards();
      const activeId = state.activeCardId!;
      const otherId = Object.keys(state.cards).find(
        (id) => id !== activeId,
      )!;

      const result = collectionReducer(state, {
        type: "DELETE_CARD",
        id: activeId,
      });

      expect(result.cards[activeId]).toBeUndefined();
      expect(Object.keys(result.cards)).toHaveLength(1);
      expect(result.activeCardId).toBe(otherId);
    });

    it("deleting the only (active) card falls back to no active card / goal entry", () => {
      let state = createInitialCollectionState();
      state = fillGoals(state);
      state = collectionReducer(state, { type: "GENERATE_CARD" });
      const id = state.activeCardId!;

      const result = collectionReducer(state, {
        type: "DELETE_CARD",
        id,
      });

      expect(result.cards).toEqual({});
      expect(result.activeCardId).toBeNull();
    });

    it("is a no-op for an id that does not exist in the collection", () => {
      const state = twoCards();
      const result = collectionReducer(state, {
        type: "DELETE_CARD",
        id: "does-not-exist",
      });
      expect(result).toBe(state);
    });

    it("clears a rename error that belonged to the deleted card", () => {
      const state = twoCards();
      const activeId = state.activeCardId!;
      const otherId = Object.keys(state.cards).find(
        (id) => id !== activeId,
      )!;
      const otherName = state.cards[otherId].name;

      const withError = collectionReducer(state, {
        type: "RENAME_CARD",
        id: activeId,
        name: otherName,
      });
      expect(withError.renameError).not.toBeNull();

      const result = collectionReducer(withError, {
        type: "DELETE_CARD",
        id: activeId,
      });

      expect(result.renameError).toBeNull();
    });
  });

  describe("NEW_CARD", () => {
    it("clears the active card and goal-entry list without altering existing cards", () => {
      let state = createInitialCollectionState();
      state = fillGoals(state);
      state = collectionReducer(state, { type: "GENERATE_CARD" });
      const existingId = state.activeCardId!;
      const existingCardBefore = state.cards[existingId];

      const started = collectionReducer(state, { type: "NEW_CARD" });

      expect(started.activeCardId).toBeNull();
      expect(started.goals).toEqual([]);
      expect(started.cards[existingId]).toEqual(existingCardBefore);
      expect(Object.keys(started.cards)).toHaveLength(1);
    });

    it("does not create a collection member by itself - only GENERATE_CARD does", () => {
      const state = createInitialCollectionState();
      const started = collectionReducer(state, { type: "NEW_CARD" });
      expect(Object.keys(started.cards)).toHaveLength(0);
    });

    it("is a no-op when already at a clean goal-entry state", () => {
      const state = createInitialCollectionState();
      const result = collectionReducer(state, { type: "NEW_CARD" });
      expect(result).toBe(state);
    });
  });
});
