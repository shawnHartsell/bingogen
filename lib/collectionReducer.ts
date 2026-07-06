/**
 * Pure collection reducer: cards keyed by a stable `id`, plus an
 * `activeCardId`. Kept free of React/persistence so it is directly
 * unit-testable as a pure function.
 */
import {
  type AppAction,
  type Cell,
  type CollectionState,
  type PersistedCard,
  CURRENT_SCHEMA_VERSION,
  GOALS_REQUIRED,
  MAX_GOAL_LENGTH,
  MAX_NOTES_LENGTH,
  FREE_SPACE_INDEX,
  GRID_SIZE,
  TOTAL_CELLS,
} from "@/lib/types";
import { shuffle } from "@/lib/shuffle";
import { detectBingos, findNewBingos } from "@/lib/bingo";
import { createUniqueDefaultName } from "@/lib/cardName";

export function createInitialCollectionState(): CollectionState {
  return {
    goals: [],
    cards: {},
    activeCardId: null,
    newBingos: [],
    hydrated: false,
    saveError: null,
  };
}

// ─── Helpers ──────────────────────────────────────────────
function buildCells(goals: string[]): Cell[] {
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

function generateCardId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `card-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getActiveCard(state: CollectionState): PersistedCard | null {
  return state.activeCardId ? (state.cards[state.activeCardId] ?? null) : null;
}

function replaceActiveCard(
  state: CollectionState,
  updatedCard: PersistedCard,
): CollectionState {
  return {
    ...state,
    cards: { ...state.cards, [updatedCard.id]: updatedCard },
  };
}

// ─── Reducer ──────────────────────────────────────────────
export function collectionReducer(
  state: CollectionState,
  action: AppAction,
): CollectionState {
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
      if (state.goals.length !== GOALS_REQUIRED) return state;

      const now = new Date();
      const nowIso = now.toISOString();
      const id = generateCardId();
      const existingNames = Object.values(state.cards).map((c) => c.name);
      const name = createUniqueDefaultName(now, existingNames);

      const card: PersistedCard = {
        id,
        name,
        createdAt: nowIso,
        updatedAt: nowIso,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        goals: state.goals,
        cells: buildCells(state.goals),
        cardGenerated: true,
        completedBingos: [],
      };

      return {
        ...state,
        goals: [],
        cards: { ...state.cards, [id]: card },
        activeCardId: id,
        newBingos: [],
      };
    }

    case "TOGGLE_COMPLETION": {
      const activeCard = getActiveCard(state);
      if (!activeCard) return state;

      const { cellIndex } = action;
      if (cellIndex < 0 || cellIndex >= TOTAL_CELLS) return state;
      if (activeCard.cells[cellIndex].isFreeSpace) return state;

      const newCells = activeCard.cells.map((cell, i) =>
        i === cellIndex ? { ...cell, isCompleted: !cell.isCompleted } : cell,
      );

      const completed = newCells.map((c) => c.isCompleted);
      const newCompletedBingos = detectBingos(completed);
      const newBingos = findNewBingos(
        newCompletedBingos,
        activeCard.completedBingos,
      );

      const updatedCard: PersistedCard = {
        ...activeCard,
        cells: newCells,
        completedBingos: newCompletedBingos,
        updatedAt: new Date().toISOString(),
      };

      return { ...replaceActiveCard(state, updatedCard), newBingos };
    }

    case "UPDATE_NOTES": {
      const activeCard = getActiveCard(state);
      if (!activeCard) return state;

      const { cellIndex, notes } = action;
      if (cellIndex < 0 || cellIndex >= TOTAL_CELLS) return state;
      const truncated = notes.slice(0, MAX_NOTES_LENGTH);

      const updatedCard: PersistedCard = {
        ...activeCard,
        cells: activeCard.cells.map((cell, i) =>
          i === cellIndex ? { ...cell, notes: truncated } : cell,
        ),
        updatedAt: new Date().toISOString(),
      };

      return replaceActiveCard(state, updatedCard);
    }

    case "UPDATE_GOAL_TITLE": {
      const activeCard = getActiveCard(state);
      if (!activeCard) return state;

      const { cellIndex, title } = action;
      if (cellIndex < 0 || cellIndex >= TOTAL_CELLS) return state;
      if (activeCard.cells[cellIndex].isFreeSpace) return state;
      const trimmed = title.trim();
      if (trimmed.length === 0 || trimmed.length > MAX_GOAL_LENGTH) {
        return state;
      }

      const updatedCard: PersistedCard = {
        ...activeCard,
        cells: activeCard.cells.map((cell, i) =>
          i === cellIndex ? { ...cell, goalTitle: trimmed } : cell,
        ),
        updatedAt: new Date().toISOString(),
      };

      return replaceActiveCard(state, updatedCard);
    }

    case "HYDRATE": {
      const cardsRecord: Record<string, PersistedCard> = {};
      for (const card of action.cards) {
        cardsRecord[card.id] = card;
      }
      const activeCardId =
        action.activeCardId && cardsRecord[action.activeCardId]
          ? action.activeCardId
          : null;

      return {
        ...state,
        cards: cardsRecord,
        activeCardId,
        hydrated: true,
      };
    }

    case "SAVE_ERROR": {
      return { ...state, saveError: action.message };
    }

    case "RESET": {
      return createInitialCollectionState();
    }

    default:
      return state;
  }
}
