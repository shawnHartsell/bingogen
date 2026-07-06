// Pure state/reducer for the app - no React, no I/O. Kept free of side effects
// so it can be unit tested directly and so AppProvider can layer
// persistence (autosave/rehydrate) on top without entangling the two.

import {
  type AppState,
  type AppAction,
  type Cell,
  type PersistedCard,
  GOALS_REQUIRED,
  MAX_GOAL_LENGTH,
  MAX_NOTES_LENGTH,
  FREE_SPACE_INDEX,
  GRID_SIZE,
  TOTAL_CELLS,
  CURRENT_SCHEMA_VERSION,
} from "@/lib/types";
import { shuffle } from "@/lib/shuffle";
import { detectBingos, findNewBingos } from "@/lib/bingo";
import { buildUniqueDefaultCardName, generateCardId } from "@/lib/cardNaming";

// ─── Initial State ────────────────────────────────────────
export const initialState: AppState = {
  goals: [],
  cards: {},
  activeCardId: null,
  hydrated: false,
  cardGenerated: false,
  newBingos: [],
};

// ─── Helpers ──────────────────────────────────────────────
export function buildCells(goals: string[]): Cell[] {
  const shuffled = shuffle(goals);
  const cells: Cell[] = [];
  let goalIdx = 0;

  for (let i = 0; i < TOTAL_CELLS; i++) {
    const row = Math.floor(i / GRID_SIZE);
    const col = i % GRID_SIZE;
    const isFreeSpace = i === FREE_SPACE_INDEX;

    cells.push({
      row,
      col,
      goalTitle: isFreeSpace ? "FREE" : shuffled[goalIdx++],
      isFreeSpace,
      isCompleted: isFreeSpace, // free space always completed
      notes: "",
    });
  }

  return cells;
}

function getActiveCard(state: AppState): PersistedCard | null {
  return state.activeCardId ? (state.cards[state.activeCardId] ?? null) : null;
}

/** Returns new state with the active card replaced by `updater(activeCard)`. */
function updateActiveCard(
  state: AppState,
  updater: (card: PersistedCard) => PersistedCard,
): AppState {
  const active = getActiveCard(state);
  if (!active) return state;

  const updated = updater(active);
  return {
    ...state,
    cards: { ...state.cards, [updated.id]: updated },
  };
}

// ─── Reducer ──────────────────────────────────────────────
export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "ADD_GOAL": {
      const trimmed = action.goal.trim();
      if (
        trimmed.length === 0 ||
        trimmed.length > MAX_GOAL_LENGTH ||
        state.goals.length >= GOALS_REQUIRED
      ) {
        return state;
      }
      return { ...state, goals: [...state.goals, trimmed] };
    }

    case "REMOVE_GOAL": {
      if (action.index < 0 || action.index >= state.goals.length) {
        return state;
      }
      return {
        ...state,
        goals: state.goals.filter((_, i) => i !== action.index),
      };
    }

    case "GENERATE_CARD": {
      if (state.goals.length !== GOALS_REQUIRED) {
        return state;
      }

      const now = new Date();
      const existingNames = Object.values(state.cards).map((c) => c.name);
      const newCard: PersistedCard = {
        id: generateCardId(),
        name: buildUniqueDefaultCardName(now, existingNames),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        schemaVersion: CURRENT_SCHEMA_VERSION,
        cells: buildCells(state.goals),
        completedBingos: [],
      };

      return {
        ...state,
        cards: { ...state.cards, [newCard.id]: newCard },
        activeCardId: newCard.id,
        cardGenerated: true,
        newBingos: [],
      };
    }

    case "TOGGLE_COMPLETION": {
      const { cellIndex } = action;
      if (cellIndex < 0 || cellIndex >= TOTAL_CELLS) return state;

      const active = getActiveCard(state);
      if (!active) return state;
      if (active.cells[cellIndex].isFreeSpace) return state;

      const newCells = active.cells.map((cell, i) =>
        i === cellIndex ? { ...cell, isCompleted: !cell.isCompleted } : cell,
      );

      const completed = newCells.map((c) => c.isCompleted);
      const newCompletedBingos = detectBingos(completed);
      const newBingos = findNewBingos(newCompletedBingos, active.completedBingos);

      return {
        ...updateActiveCard(state, (card) => ({
          ...card,
          cells: newCells,
          completedBingos: newCompletedBingos,
          updatedAt: new Date().toISOString(),
        })),
        newBingos,
      };
    }

    case "UPDATE_NOTES": {
      const { cellIndex, notes } = action;
      if (cellIndex < 0 || cellIndex >= TOTAL_CELLS) return state;
      const active = getActiveCard(state);
      if (!active) return state;

      const truncated = notes.slice(0, MAX_NOTES_LENGTH);
      return updateActiveCard(state, (card) => ({
        ...card,
        cells: card.cells.map((cell, i) =>
          i === cellIndex ? { ...cell, notes: truncated } : cell,
        ),
        updatedAt: new Date().toISOString(),
      }));
    }

    case "UPDATE_GOAL_TITLE": {
      const { cellIndex, title } = action;
      if (cellIndex < 0 || cellIndex >= TOTAL_CELLS) return state;
      const active = getActiveCard(state);
      if (!active) return state;
      if (active.cells[cellIndex].isFreeSpace) return state;

      const trimmed = title.trim();
      if (trimmed.length === 0 || trimmed.length > MAX_GOAL_LENGTH)
        return state;

      return updateActiveCard(state, (card) => ({
        ...card,
        cells: card.cells.map((cell, i) =>
          i === cellIndex ? { ...cell, goalTitle: trimmed } : cell,
        ),
        updatedAt: new Date().toISOString(),
      }));
    }

    case "HYDRATE": {
      const { cards, activeCardId } = action;
      const activeExists = !!activeCardId && !!cards[activeCardId];
      return {
        ...state,
        cards,
        activeCardId: activeExists ? activeCardId : null,
        cardGenerated: activeExists,
        newBingos: [],
        hydrated: true,
      };
    }

    case "RESET": {
      return { ...initialState, hydrated: state.hydrated };
    }

    default:
      return state;
  }
}
