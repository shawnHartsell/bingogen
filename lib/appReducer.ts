/**
 * Pure collection reducer for the app state - the second test seam from the
 * PRD. Kept free of React/browser APIs so it can be unit-tested directly.
 */
import {
  type AppState,
  type AppAction,
  type BingoCard,
  type Cell,
  CARD_SCHEMA_VERSION,
  GOALS_REQUIRED,
  MAX_GOAL_LENGTH,
  MAX_NOTES_LENGTH,
  FREE_SPACE_INDEX,
  GRID_SIZE,
  TOTAL_CELLS,
} from "@/lib/types";
import { shuffle } from "@/lib/shuffle";
import { detectBingos, findNewBingos } from "@/lib/bingo";

// ─── Initial State ────────────────────────────────────────
export const initialState: AppState = {
  goals: [],
  cards: {},
  cardOrder: [],
  activeCardId: null,
  newBingos: [],
  hydrated: false,
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

const MONTH_DAY = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});
const HOUR_MINUTE = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: false,
});

/**
 * Derives a default card name from its creation time (US6), e.g.
 * "Card - Jul 6, 12:03". Guaranteed unique against `existingNames` by
 * appending a counter suffix on collision, so fresh cards never collide.
 */
export function createDefaultCardName(
  createdAt: Date,
  existingNames: Iterable<string>,
): string {
  const base = `Card - ${MONTH_DAY.format(createdAt)}, ${HOUR_MINUTE.format(createdAt)}`;
  const taken = new Set(existingNames);
  if (!taken.has(base)) return base;

  let suffix = 2;
  while (taken.has(`${base} (${suffix})`)) {
    suffix += 1;
  }
  return `${base} (${suffix})`;
}

function getActiveCard(state: AppState): BingoCard | null {
  return state.activeCardId ? (state.cards[state.activeCardId] ?? null) : null;
}

function updateActiveCard(
  state: AppState,
  update: (card: BingoCard) => BingoCard,
): AppState {
  const active = getActiveCard(state);
  if (!active) return state;

  const updated = update(active);
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
      const nowIso = now.toISOString();
      const id = generateCardId();
      const existingNames = Object.values(state.cards).map((c) => c.name);

      const newCard: BingoCard = {
        id,
        name: createDefaultCardName(now, existingNames),
        createdAt: nowIso,
        updatedAt: nowIso,
        schemaVersion: CARD_SCHEMA_VERSION,
        cells: buildCells(state.goals),
        completedBingos: [],
      };

      return {
        ...state,
        goals: [],
        cards: { ...state.cards, [id]: newCard },
        cardOrder: [...state.cardOrder, id],
        activeCardId: id,
        newBingos: [],
      };
    }

    case "TOGGLE_COMPLETION": {
      const { cellIndex } = action;
      const active = getActiveCard(state);
      if (!active) return state;
      if (cellIndex < 0 || cellIndex >= TOTAL_CELLS) return state;
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
      const active = getActiveCard(state);
      if (!active) return state;
      if (cellIndex < 0 || cellIndex >= TOTAL_CELLS) return state;
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
      const active = getActiveCard(state);
      if (!active) return state;
      if (cellIndex < 0 || cellIndex >= TOTAL_CELLS) return state;
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

    case "REHYDRATE": {
      const cards: Record<string, BingoCard> = {};
      const cardOrder: string[] = [];
      for (const card of action.cards) {
        cards[card.id] = card;
        cardOrder.push(card.id);
      }
      const activeCardId =
        action.activeCardId && cards[action.activeCardId]
          ? action.activeCardId
          : null;

      return {
        ...state,
        cards,
        cardOrder,
        activeCardId,
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

export { getActiveCard };
