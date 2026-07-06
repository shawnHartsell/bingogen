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
    renameError: null,
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

    case "SET_ACTIVE_CARD": {
      // Switching cards is a pure pointer swap - every card independently
      // retains its own cells/notes/completedBingos, so no data is copied
      // or mutated here.
      if (!state.cards[action.id]) return state;
      if (state.activeCardId === action.id) return state;
      return { ...state, activeCardId: action.id, newBingos: [] };
    }

    case "RENAME_CARD": {
      // Rename is a labeling action on an existing card - it always
      // updates an existing member's `name`/`updatedAt` in place and
      // never creates a new one.
      const card = state.cards[action.id];
      if (!card) return state;

      const trimmed = action.name.trim();
      if (trimmed.length === 0) {
        return {
          ...state,
          renameError: { id: action.id, message: "Name can't be empty." },
        };
      }

      // Renaming a card to its own current name is a no-op, not a
      // duplicate error - and clears any stale error for this card.
      if (trimmed === card.name) {
        return state.renameError && state.renameError.id === action.id
          ? { ...state, renameError: null }
          : state;
      }

      const isDuplicate = Object.values(state.cards).some(
        (other) => other.id !== action.id && other.name === trimmed,
      );
      if (isDuplicate) {
        return {
          ...state,
          renameError: {
            id: action.id,
            message: "That name is already used by another card.",
          },
        };
      }

      const updatedCard: PersistedCard = {
        ...card,
        name: trimmed,
        updatedAt: new Date().toISOString(),
      };

      return {
        ...state,
        cards: { ...state.cards, [updatedCard.id]: updatedCard },
        renameError: null,
      };
    }

    case "DELETE_CARD": {
      const card = state.cards[action.id];
      if (!card) return state;

      const remainingCards = { ...state.cards };
      delete remainingCards[action.id];

      // Deleting the active card must leave the app in a coherent state:
      // promote another remaining card to active, or fall back to no
      // active card (goal entry) if none remain.
      const activeCardId =
        state.activeCardId === action.id
          ? (Object.keys(remainingCards)[0] ?? null)
          : state.activeCardId;

      return {
        ...state,
        cards: remainingCards,
        activeCardId,
        newBingos: state.activeCardId === action.id ? [] : state.newBingos,
        renameError:
          state.renameError && state.renameError.id === action.id
            ? null
            : state.renameError,
      };
    }

    case "NEW_CARD": {
      // Starts a fresh goal-entry flow for another card without touching
      // any existing collection member: no card is created (and no
      // existing card is altered) until GENERATE_CARD runs again.
      if (state.activeCardId === null && state.goals.length === 0) {
        return state;
      }
      return { ...state, goals: [], activeCardId: null, newBingos: [] };
    }

    case "RESET": {
      return createInitialCollectionState();
    }

    default:
      return state;
  }
}
