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
import { defaultCardName } from "@/lib/cardNaming";
import { cardRepository } from "@/lib/persistence/localStorageCardRepository";

// ─── Initial State ────────────────────────────────────────
const initialState: AppState = {
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
      const card: BingoCard = {
        id: crypto.randomUUID(),
        name: defaultCardName(now),
        cells: buildCells(state.goals),
        completedBingos: [],
        createdAt: nowIso,
        updatedAt: nowIso,
        schemaVersion: CURRENT_SCHEMA_VERSION,
      };
      return {
        ...state,
        cards: { ...state.cards, [card.id]: card },
        activeCardId: card.id,
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
      const newBingos = findNewBingos(
        newCompletedBingos,
        active.completedBingos,
      );

      return {
        ...state,
        cards: updateActiveCard(state, active, {
          cells: newCells,
          completedBingos: newCompletedBingos,
        }),
        newBingos,
      };
    }

    case "UPDATE_NOTES": {
      const active = getActiveCard(state);
      if (!active) return state;
      const { cellIndex, notes } = action;
      if (cellIndex < 0 || cellIndex >= TOTAL_CELLS) return state;
      const truncated = notes.slice(0, MAX_NOTES_LENGTH);
      return {
        ...state,
        cards: updateActiveCard(state, active, {
          cells: active.cells.map((cell, i) =>
            i === cellIndex ? { ...cell, notes: truncated } : cell,
          ),
        }),
      };
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
      return {
        ...state,
        cards: updateActiveCard(state, active, {
          cells: active.cells.map((cell, i) =>
            i === cellIndex ? { ...cell, goalTitle: trimmed } : cell,
          ),
        }),
      };
    }

    case "HYDRATE": {
      const cards: Record<string, BingoCard> = {};
      for (const card of action.cards) {
        cards[card.id] = card;
      }
      const activeCardId =
        action.activeCardId !== null && cards[action.activeCardId]
          ? action.activeCardId
          : null;
      return {
        ...state,
        cards,
        activeCardId,
        hydrated: true,
      };
    }

    case "RESET": {
      return initialState;
    }

    default:
      return state;
  }
}

// ─── Selectors ────────────────────────────────────────────
export function getActiveCard(state: AppState): BingoCard | null {
  if (!state.activeCardId) return null;
  return state.cards[state.activeCardId] ?? null;
}

function updateActiveCard(
  state: AppState,
  active: BingoCard,
  changes: Partial<Pick<BingoCard, "cells" | "completedBingos" | "name">>,
): Record<string, BingoCard> {
  const updated: BingoCard = {
    ...active,
    ...changes,
    updatedAt: new Date().toISOString(),
  };
  return { ...state.cards, [active.id]: updated };
}

// ─── Context ──────────────────────────────────────────────
interface AppContextValue {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  activeCard: BingoCard | null;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const activeCard = getActiveCard(state);

  // Rehydrate the collection from the persistence port on mount, then
  // restore whichever card was last active.
  useEffect(() => {
    let cancelled = false;
    async function rehydrate() {
      try {
        const [cards, activeCardId] = await Promise.all([
          cardRepository.listCards(),
          cardRepository.getActiveCardId(),
        ]);
        if (!cancelled) {
          dispatch({ type: "HYDRATE", cards, activeCardId });
        }
      } catch (err) {
        // A failed rehydrate should never crash the app — start clean.
        console.error("Failed to rehydrate card collection:", err);
        if (!cancelled) {
          dispatch({ type: "HYDRATE", cards: [], activeCardId: null });
        }
      }
    }
    rehydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  // Autosave: persist the active card and its id on every change, once
  // rehydration has completed (so we never overwrite stored data with
  // initial state before it has loaded).
  useEffect(() => {
    if (!state.hydrated) return;
    if (!activeCard) {
      cardRepository.setActiveCardId(null).catch((err) => {
        console.error("Failed to persist active card id:", err);
      });
      return;
    }
    cardRepository.saveCard(activeCard).catch((err) => {
      console.error("Failed to autosave card:", err);
    });
    cardRepository.setActiveCardId(activeCard.id).catch((err) => {
      console.error("Failed to persist active card id:", err);
    });
  }, [state.hydrated, activeCard]);

  return (
    <AppContext.Provider value={{ state, dispatch, activeCard }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return ctx;
}
