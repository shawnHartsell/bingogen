/**
 * Pure collection reducer for the card collection: cards keyed by a stable
 * `id`, plus an `activeCardId`. `GENERATE_CARD` creates a new member and
 * makes it active; the active card is what renders on the board.
 *
 * Kept dependency-free from React so it can be unit-tested directly.
 */
import {
  type CollectionState,
  type CardRecord,
  type AppState,
  type AppAction,
  type Cell,
  GOALS_REQUIRED,
  MAX_GOAL_LENGTH,
  MAX_NOTES_LENGTH,
  FREE_SPACE_INDEX,
  GRID_SIZE,
  TOTAL_CELLS,
} from "@/lib/types";
import { CARD_SCHEMA_VERSION } from "@/lib/persistence/types";
import { shuffle } from "@/lib/shuffle";
import { detectBingos, findNewBingos } from "@/lib/bingo";

// ─── Initial State ────────────────────────────────────────
export const initialCollectionState: CollectionState = {
  goals: [],
  cards: {},
  activeCardId: null,
  newBingos: [],
};

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
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `card-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Derives a sensible, unique-by-construction default name from a card's
 * creation time, e.g. "Card - Jul 6, 12:03:45". Second-level precision makes
 * collisions between cards created via distinct user actions practically
 * impossible.
 */
export function generateDefaultCardName(createdAt: Date): string {
  const datePart = createdAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const timePart = createdAt.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return `Card - ${datePart}, ${timePart}`;
}

function getActiveCard(state: CollectionState): CardRecord | null {
  if (!state.activeCardId) return null;
  return state.cards[state.activeCardId] ?? null;
}

/** Derives the legacy flat board view consumed by page/UI components. */
export function selectAppState(state: CollectionState): AppState {
  const active = getActiveCard(state);
  return {
    goals: state.goals,
    cells: active?.cells ?? [],
    cardGenerated: active !== null,
    completedBingos: active?.completedBingos ?? [],
    newBingos: state.newBingos,
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
      if (state.goals.length !== GOALS_REQUIRED) {
        return state;
      }
      const now = new Date();
      const nowIso = now.toISOString();
      const id = generateCardId();
      const newCard: CardRecord = {
        id,
        name: generateDefaultCardName(now),
        createdAt: nowIso,
        updatedAt: nowIso,
        schemaVersion: CARD_SCHEMA_VERSION,
        cells: buildCells(state.goals),
        completedBingos: [],
      };
      return {
        ...state,
        cards: { ...state.cards, [id]: newCard },
        activeCardId: id,
        newBingos: [],
      };
    }

    case "TOGGLE_COMPLETION": {
      const active = getActiveCard(state);
      if (!active) return state;

      const { cellIndex } = action;
      if (cellIndex < 0 || cellIndex >= TOTAL_CELLS) return state;
      if (active.cells[cellIndex].isFreeSpace) return state;

      const newCells = active.cells.map((cell, i) =>
        i === cellIndex ? { ...cell, isCompleted: !cell.isCompleted } : cell,
      );

      const completed = newCells.map((c) => c.isCompleted);
      const newCompletedBingos = detectBingos(completed);
      const newBingos = findNewBingos(newCompletedBingos, active.completedBingos);

      const updatedCard: CardRecord = {
        ...active,
        cells: newCells,
        completedBingos: newCompletedBingos,
        updatedAt: new Date().toISOString(),
      };

      return {
        ...state,
        cards: { ...state.cards, [active.id]: updatedCard },
        newBingos,
      };
    }

    case "UPDATE_NOTES": {
      const active = getActiveCard(state);
      if (!active) return state;

      const { cellIndex, notes } = action;
      if (cellIndex < 0 || cellIndex >= TOTAL_CELLS) return state;
      const truncated = notes.slice(0, MAX_NOTES_LENGTH);

      const updatedCard: CardRecord = {
        ...active,
        cells: active.cells.map((cell, i) =>
          i === cellIndex ? { ...cell, notes: truncated } : cell,
        ),
        updatedAt: new Date().toISOString(),
      };

      return { ...state, cards: { ...state.cards, [active.id]: updatedCard } };
    }

    case "UPDATE_GOAL_TITLE": {
      const active = getActiveCard(state);
      if (!active) return state;

      const { cellIndex, title } = action;
      if (cellIndex < 0 || cellIndex >= TOTAL_CELLS) return state;
      if (active.cells[cellIndex].isFreeSpace) return state;
      const trimmed = title.trim();
      if (trimmed.length === 0 || trimmed.length > MAX_GOAL_LENGTH)
        return state;

      const updatedCard: CardRecord = {
        ...active,
        cells: active.cells.map((cell, i) =>
          i === cellIndex ? { ...cell, goalTitle: trimmed } : cell,
        ),
        updatedAt: new Date().toISOString(),
      };

      return { ...state, cards: { ...state.cards, [active.id]: updatedCard } };
    }

    case "HYDRATE": {
      const cards: Record<string, CardRecord> = {};
      for (const card of action.cards) {
        cards[card.id] = card;
      }
      const activeCardId =
        action.activeCardId && cards[action.activeCardId]
          ? action.activeCardId
          : null;
      return {
        ...state,
        cards,
        activeCardId,
      };
    }

    case "RESET": {
      return initialCollectionState;
    }

    default:
      return state;
  }
}
