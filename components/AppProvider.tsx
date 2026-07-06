"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
  type Dispatch,
} from "react";
import type { AppAction, Cell } from "@/lib/types";
import { appReducer, initialState } from "@/lib/appReducer";
import { createLocalStorageCardRepository } from "@/lib/cardRepository";

// ─── Context ──────────────────────────────────────────────
// The shape components consume: the raw collection state plus the active
// card's board flattened onto it for convenience (only one card is reachable
// from the UI in this slice - no sidebar yet).
interface AppContextState {
  goals: string[];
  cells: Cell[];
  cardGenerated: boolean;
  completedBingos: number[];
  newBingos: number[];
  hydrated: boolean;
}

interface AppContextValue {
  state: AppContextState;
  dispatch: Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const repo = useMemo(() => createLocalStorageCardRepository(), []);

  // Rehydrate the collection from the repository once on mount.
  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const [cards, activeCardId] = await Promise.all([
          repo.list(),
          repo.getActiveCardId(),
        ]);
        if (cancelled) return;
        const cardMap = Object.fromEntries(cards.map((c) => [c.id, c]));
        dispatch({ type: "HYDRATE", cards: cardMap, activeCardId });
      } catch (err) {
        console.error("Failed to restore saved cards", err);
        if (!cancelled) {
          dispatch({ type: "HYDRATE", cards: {}, activeCardId: null });
        }
      }
    }

    hydrate();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave: persist the active card on every change, once hydrated (so we
  // never overwrite persisted data with the initial empty state).
  useEffect(() => {
    if (!state.hydrated || !state.activeCardId) return;
    const activeCard = state.cards[state.activeCardId];
    if (!activeCard) return;

    repo.save(activeCard).catch((err) => {
      console.error("Failed to autosave card", err);
    });
  }, [state.hydrated, state.activeCardId, state.cards, repo]);

  // Keep the persisted "last active card" pointer in sync.
  useEffect(() => {
    if (!state.hydrated) return;
    repo.setActiveCardId(state.activeCardId).catch((err) => {
      console.error("Failed to persist active card pointer", err);
    });
  }, [state.hydrated, state.activeCardId, repo]);

  const activeCard = state.activeCardId
    ? state.cards[state.activeCardId]
    : null;

  const contextValue = useMemo<AppContextValue>(
    () => ({
      state: {
        goals: state.goals,
        cells: activeCard?.cells ?? [],
        cardGenerated: state.cardGenerated,
        completedBingos: activeCard?.completedBingos ?? [],
        newBingos: state.newBingos,
        hydrated: state.hydrated,
      },
      dispatch,
    }),
    [state, activeCard],
  );

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return ctx;
}
