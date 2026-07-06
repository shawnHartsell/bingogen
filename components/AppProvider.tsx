"use client";

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type ReactNode,
  type Dispatch,
} from "react";
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
import { generateDefaultCardName } from "@/lib/cardName";
import { cardRepository } from "@/lib/cardRepository";

// ─── Initial State ────────────────────────────────────────
export const initialState: AppState = {
  goals: [],
  cards: {},
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

function makeCardId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID (older Node/browsers).
  return `card-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Returns the active card, or null if there isn't one. */
export function getActiveCard(state: AppState): BingoCard | null {
  if (!state.activeCardId) return null;
  return state.cards[state.activeCardId] ?? null;
}

function updateActiveCard(
  state: AppState,
  updater: (card: BingoCard) => BingoCard,
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
      const nowIso = now.toISOString();
      const id = makeCardId();
      const name = generateDefaultCardName(
        Object.values(state.cards).map((c) => c.name),
        now,
      );
      const card: BingoCard = {
        id,
        name,
        cells: buildCells(state.goals),
        completedBingos: [],
        createdAt: nowIso,
        updatedAt: nowIso,
        schemaVersion: CARD_SCHEMA_VERSION,
      };
      return {
        ...state,
        cards: { ...state.cards, [id]: card },
        activeCardId: id,
        newBingos: [],
      };
    }

    case "TOGGLE_COMPLETION": {
      const active = getActiveCard(state);
      const { cellIndex } = action;
      if (!active) return state;
      if (cellIndex < 0 || cellIndex >= TOTAL_CELLS) return state;
      if (active.cells[cellIndex].isFreeSpace) return state;

      const newCells = active.cells.map((cell, i) =>
        i === cellIndex ? { ...cell, isCompleted: !cell.isCompleted } : cell,
      );

      const completed = newCells.map((c) => c.isCompleted);
      const newCompletedBingos = detectBingos(completed);
      const newBingos = findNewBingos(
        newCompletedBingos,
        active.completedBingos,
      );

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
      const active = getActiveCard(state);
      const { cellIndex, notes } = action;
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
      const active = getActiveCard(state);
      const { cellIndex, title } = action;
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

    case "HYDRATE": {
      const cards: Record<string, BingoCard> = {};
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

// ─── Context ──────────────────────────────────────────────
interface AppContextValue {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  // Derived selectors preserving the pre-collection shape for consumers.
  cells: Cell[];
  cardGenerated: boolean;
  completedBingos: number[];
  newBingos: number[];
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Rehydrate the collection from the persistence port on mount.
  useEffect(() => {
    let cancelled = false;
    async function rehydrate() {
      const [cards, activeCardId] = await Promise.all([
        cardRepository.listCards(),
        cardRepository.getActiveCardId(),
      ]);
      if (cancelled) return;
      dispatch({ type: "HYDRATE", cards, activeCardId });
    }
    rehydrate().catch((err) => {
      // Rehydration failure should never crash the app - start clean.
      console.error("Failed to rehydrate cards from storage:", err);
      if (!cancelled) {
        dispatch({ type: "HYDRATE", cards: [], activeCardId: null });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Autosave: persist the active card through the port on every change,
  // once hydration has completed (so we don't stomp storage with the
  // initial empty state before the real data has loaded).
  useEffect(() => {
    if (!state.hydrated) return;
    const active = getActiveCard(state);
    if (!active) return;
    cardRepository.saveCard(active).catch((err) => {
      console.error("Failed to autosave active card:", err);
    });
  }, [state]);

  // Persist which card is active whenever it changes (post-hydration).
  useEffect(() => {
    if (!state.hydrated) return;
    cardRepository.setActiveCardId(state.activeCardId).catch((err) => {
      console.error("Failed to persist active card id:", err);
    });
  }, [state.hydrated, state.activeCardId]);

  const active = getActiveCard(state);
  const value: AppContextValue = {
    state,
    dispatch,
    cells: active?.cells ?? [],
    cardGenerated: active !== null,
    completedBingos: active?.completedBingos ?? [],
    newBingos: state.newBingos,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): {
  state: AppState & {
    cells: Cell[];
    cardGenerated: boolean;
    completedBingos: number[];
  };
  dispatch: Dispatch<AppAction>;
} {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return {
    dispatch: ctx.dispatch,
    state: {
      ...ctx.state,
      cells: ctx.cells,
      cardGenerated: ctx.cardGenerated,
      completedBingos: ctx.completedBingos,
      newBingos: ctx.newBingos,
    },
  };
}
