"use client";

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  type ReactNode,
  type Dispatch,
} from "react";
import type { AppState, AppAction } from "@/lib/types";
import { appReducer, initialState, getActiveCard } from "@/lib/appReducer";
import { cardRepository } from "@/lib/cardRepository";

// ─── Context ──────────────────────────────────────────────
interface AppContextValue {
  state: AppState;
  dispatch: Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Rehydrate the collection from the persistence port on mount.
  useEffect(() => {
    let cancelled = false;

    async function rehydrate() {
      const [cards, activeCardId] = await Promise.all([
        cardRepository.list(),
        cardRepository.getActiveCardId(),
      ]);
      if (cancelled) return;
      dispatch({ type: "REHYDRATE", cards, activeCardId });
    }

    rehydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  // Autosave the active card continuously, once hydrated (so we never
  // clobber persisted data with the initial empty state).
  const previousActiveIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!state.hydrated) return;

    const activeCard = getActiveCard(state);

    if (activeCard) {
      cardRepository.save(activeCard).catch((err) => {
        console.error("Failed to autosave bingo card:", err);
      });
    }

    if (previousActiveIdRef.current !== state.activeCardId) {
      previousActiveIdRef.current = state.activeCardId;
      cardRepository.setActiveCardId(state.activeCardId).catch((err) => {
        console.error("Failed to persist active card id:", err);
      });
    }
  }, [state]);

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
