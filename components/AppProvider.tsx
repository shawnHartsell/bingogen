"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type Dispatch,
} from "react";
import type { AppState, AppAction, CardRecord } from "@/lib/types";
import {
  collectionReducer,
  initialCollectionState,
  selectAppState,
} from "@/lib/appReducer";
import { LocalStorageCardRepository } from "@/lib/persistence/localStorageCardRepository";
import type { CardRepository } from "@/lib/persistence/types";

// The repository is a module-level singleton: a client-only implementation
// that owns all reads/writes. It is SSR-safe (guards undefined
// window/localStorage internally), so constructing it during a server
// render is harmless.
const defaultRepository: CardRepository = new LocalStorageCardRepository();

// ─── Context ──────────────────────────────────────────────
interface AppContextValue {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  /** True once the collection has finished rehydrating from the port. */
  hydrated: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({
  children,
  repository = defaultRepository,
}: {
  children: ReactNode;
  /** Overridable for tests; defaults to the localStorage-backed repository. */
  repository?: CardRepository;
}) {
  const [collectionState, dispatch] = useReducer(
    collectionReducer,
    initialCollectionState,
  );
  const [hydrated, setHydrated] = useState(false);
  const activeIdRef = useRef<string | null>(null);

  // Rehydrate the collection from the port on mount; the last-active card is
  // placed on the board once loaded.
  useEffect(() => {
    let cancelled = false;

    async function rehydrate() {
      const [cards, activeCardId] = await Promise.all([
        repository.list(),
        repository.getActiveCardId(),
      ]);
      if (cancelled) return;
      dispatch({ type: "HYDRATE", cards, activeCardId });
      setHydrated(true);
    }

    rehydrate();

    return () => {
      cancelled = true;
    };
  }, [repository]);

  // Autosave: the active card persists continuously through the port on
  // every change, once the initial rehydrate has completed (so we never
  // clobber stored data with the transient pre-hydration empty state).
  useEffect(() => {
    if (!hydrated) return;

    const activeCard: CardRecord | null = collectionState.activeCardId
      ? (collectionState.cards[collectionState.activeCardId] ?? null)
      : null;

    if (activeCard) {
      repository.save(activeCard).catch((err) => {
        // Surface (rather than silently swallow) write failures, e.g.
        // QuotaExceededError, without crashing the render.
        console.error("Failed to autosave bingo card:", err);
      });
    }

    if (activeIdRef.current !== collectionState.activeCardId) {
      activeIdRef.current = collectionState.activeCardId;
      repository.setActiveCardId(collectionState.activeCardId).catch((err) => {
        console.error("Failed to persist active card id:", err);
      });
    }
  }, [
    hydrated,
    collectionState.activeCardId,
    collectionState.cards,
    repository,
  ]);

  const state = selectAppState(collectionState);

  return (
    <AppContext.Provider value={{ state, dispatch, hydrated }}>
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
