"use client";

import {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
  type Dispatch,
} from "react";
import {
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
import { shuffle } from "@/lib/shuffle";
import { detectBingos, findNewBingos } from "@/lib/bingo";

// ─── Initial State ────────────────────────────────────────
const initialState: AppState = {
  goals: [],
  cells: [],
  cardGenerated: false,
  completedBingos: [],
  newBingos: [],
  cardId: null,
  cardTitle: "",
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

export { buildCells as buildCellsFromGoals };

// ─── Reducer ──────────────────────────────────────────────
function appReducer(state: AppState, action: AppAction): AppState {
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
      if (!state.cardTitle.trim()) {
        return state;
      }
      return {
        ...state,
        cells: buildCells(state.goals),
        cardGenerated: true,
        completedBingos: [],
        newBingos: [],
      };
    }

    case "TOGGLE_COMPLETION": {
      const { cellIndex } = action;
      if (cellIndex < 0 || cellIndex >= TOTAL_CELLS) return state;
      if (state.cells[cellIndex].isFreeSpace) return state;

      const newCells = state.cells.map((cell, i) =>
        i === cellIndex ? { ...cell, isCompleted: !cell.isCompleted } : cell,
      );

      const completed = newCells.map((c) => c.isCompleted);
      const newCompletedBingos = detectBingos(completed);
      const newBingos = findNewBingos(
        newCompletedBingos,
        state.completedBingos,
      );

      return {
        ...state,
        cells: newCells,
        completedBingos: newCompletedBingos,
        newBingos,
      };
    }

    case "UPDATE_NOTES": {
      const { cellIndex, notes } = action;
      if (cellIndex < 0 || cellIndex >= TOTAL_CELLS) return state;
      const truncated = notes.slice(0, MAX_NOTES_LENGTH);
      return {
        ...state,
        cells: state.cells.map((cell, i) =>
          i === cellIndex ? { ...cell, notes: truncated } : cell,
        ),
      };
    }

    case "UPDATE_GOAL_TITLE": {
      const { cellIndex, title } = action;
      if (cellIndex < 0 || cellIndex >= TOTAL_CELLS) return state;
      if (state.cells[cellIndex].isFreeSpace) return state;
      const trimmed = title.trim();
      if (trimmed.length === 0 || trimmed.length > MAX_GOAL_LENGTH)
        return state;
      return {
        ...state,
        cells: state.cells.map((cell, i) =>
          i === cellIndex ? { ...cell, goalTitle: trimmed } : cell,
        ),
      };
    }

    case "SET_CARD_TITLE": {
      return { ...state, cardTitle: action.title };
    }

    case "LOAD_CARD": {
      const { card } = action;
      return {
        ...state,
        cells: card.cells,
        completedBingos: card.completedBingos,
        cardGenerated: true,
        cardId: card._id ?? null,
        cardTitle: card.title,
        newBingos: [],
        goals: card.cells.filter((c) => !c.isFreeSpace).map((c) => c.goalTitle),
      };
    }

    case "RESET": {
      return initialState;
    }

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────
interface AppContextValue {
  state: AppState;
  dispatch: Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
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
