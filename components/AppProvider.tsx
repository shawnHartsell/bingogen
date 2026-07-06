"use client";

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type ReactNode,
  type Dispatch,
} from "react";
import type { AppState, AppAction, PersistedCard } from "@/lib/types";
import {
  collectionReducer,
  createInitialCollectionState,
} from "@/lib/collectionReducer";
import { createLocalStorageCardRepository } from "@/lib/cardRepository";

// Single repository instance for the app's lifetime. SSR-safe: it lazily
// resolves `window.localStorage` per-call, so constructing it during server
// render is harmless.
const repository = createLocalStorageCardRepository();

/**
 * Derives the flattened, legacy-shaped AppState the UI consumes from the
 * collection's active card (or the pre-generation goal list when there is
 * no active card yet).
 */
function selectAppState(
  goals: string[],
  activeCard: PersistedCard | null,
  newBingos: number[],
  hydrated: boolean,
): AppState {
  return {
    goals: activeCard ? activeCard.goals : goals,
    cells: activeCard ? activeCard.cells : [],
    cardGenerated: !!activeCard,
    completedBingos: activeCard ? activeCard.completedBingos : [],
    newBingos,
    hydrated,
  };
}

/** Minimal, sidebar-facing summary of a saved card - not the full snapshot. */
export interface CardSummary {
  id: string;
  name: string;
}

// ─── Context ──────────────────────────────────────────────
interface AppContextValue {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  /** Every saved card, by name, for the persistent sidebar. */
  cards: CardSummary[];
  activeCardId: string | null;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [collectionState, dispatch] = useReducer(
    collectionReducer,
    undefined,
    createInitialCollectionState,
  );

  const activeCard = collectionState.activeCardId
    ? (collectionState.cards[collectionState.activeCardId] ?? null)
    : null;

  // Rehydrate the collection from the persistence port once on mount.
  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      let cards: PersistedCard[] = [];
      let activeCardId: string | null = null;
      try {
        [cards, activeCardId] = await Promise.all([
          repository.list(),
          repository.loadActiveId(),
        ]);
      } catch {
        // Malformed/unavailable store: rehydrate empty rather than crash.
        cards = [];
        activeCardId = null;
      }
      if (!cancelled) {
        dispatch({ type: "HYDRATE", cards, activeCardId });
      }
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  // Autosave the active card through the port on every change, continuously
  // and with no explicit save action. Skipped until hydration completes so
  // we never overwrite the stored collection with the transient initial
  // (empty) in-memory state.
  useEffect(() => {
    if (!collectionState.hydrated || !activeCard) return;
    repository.save(activeCard).catch((err) => {
      dispatch({
        type: "SAVE_ERROR",
        message: err instanceof Error ? err.message : "Failed to save card.",
      });
    });
  }, [collectionState.hydrated, activeCard]);

  // Persist which card is active whenever it changes.
  useEffect(() => {
    if (!collectionState.hydrated) return;
    repository.saveActiveId(collectionState.activeCardId).catch((err) => {
      dispatch({
        type: "SAVE_ERROR",
        message:
          err instanceof Error
            ? err.message
            : "Failed to save active card pointer.",
      });
    });
  }, [collectionState.hydrated, collectionState.activeCardId]);

  const state = selectAppState(
    collectionState.goals,
    activeCard,
    collectionState.newBingos,
    collectionState.hydrated,
  );

  const cards: CardSummary[] = Object.values(collectionState.cards)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((card) => ({ id: card.id, name: card.name }));

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        cards,
        activeCardId: collectionState.activeCardId,
      }}
    >
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
