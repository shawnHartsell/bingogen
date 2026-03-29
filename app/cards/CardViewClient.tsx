"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { BingoCard } from "@/components/BingoCard";
import { BingoCounter } from "@/components/BingoCounter";
import { CellModal } from "@/components/CellModal";
import { CardTitleInput } from "@/components/CardTitleInput";
import { CardSidebar } from "@/components/CardSidebar";
import { updateCard, deleteCard } from "@/lib/cards";
import type { BingoCardDocument, CardListItem, Cell } from "@/lib/types";
import { TOTAL_BINGO_LINES } from "@/lib/types";

interface CardViewClientProps {
  card: BingoCardDocument;
  allCards: CardListItem[];
}

export function CardViewClient({ card, allCards }: CardViewClientProps) {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const [selectedCellIndex, setSelectedCellIndex] = useState<number | null>(
    null,
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [sidebarCards, setSidebarCards] = useState<CardListItem[]>(allCards);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Track whether initial hydration is complete
  const hydratedRef = useRef(false);
  // Track the save timer for debounce
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track if a save is in-flight to serialize calls
  const savingRef = useRef(false);
  // Track pending save data
  const pendingSaveRef = useRef<{
    title: string;
    cells: Cell[];
    completedBingos: number[];
  } | null>(null);

  // Hydrate provider state from server-loaded card (only when card ID changes)
  const loadedCardIdRef = useRef<string | null>(null);
  // Use a counter to skip the first state change after hydration
  const saveGenRef = useRef(0);
  const hydrationGenRef = useRef(0);
  useEffect(() => {
    if (card._id === loadedCardIdRef.current) return;
    loadedCardIdRef.current = card._id ?? null;
    hydratedRef.current = false;
    hydrationGenRef.current += 1;
    setSaveStatus("idle");
    setSaveError(null);
    dispatch({ type: "LOAD_CARD", card });
    setSidebarCards(allCards);
  }, [card, dispatch, allCards]);

  // Mark hydration complete after LOAD_CARD takes effect, and skip the save it triggers
  useEffect(() => {
    if (state.cardId === card._id && state.cardGenerated) {
      hydratedRef.current = true;
      saveGenRef.current = hydrationGenRef.current;
    }
  }, [state.cardId, state.cardGenerated, card._id]);

  // Track cardId via ref for stable callback reference
  const cardIdRef = useRef(state.cardId);
  useEffect(() => {
    cardIdRef.current = state.cardId;
  }, [state.cardId]);

  // Auto-save with debounce
  const performSave = useCallback(
    async (title: string, cells: Cell[], completedBingos: number[]) => {
      const currentCardId = cardIdRef.current;
      if (!currentCardId) return;

      if (savingRef.current) {
        // Queue this save for after the current one completes
        pendingSaveRef.current = { title, cells, completedBingos };
        return;
      }

      savingRef.current = true;
      setSaveError(null);
      setSaveStatus("saving");

      try {
        await updateCard(currentCardId, { title, cells, completedBingos });
        setSaveStatus("saved");
        setTimeout(
          () => setSaveStatus((s) => (s === "saved" ? "idle" : s)),
          2000,
        );
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : "Failed to save changes");
        setSaveStatus("idle");
      } finally {
        savingRef.current = false;

        // Process pending save if queued
        if (pendingSaveRef.current) {
          const pending = pendingSaveRef.current;
          pendingSaveRef.current = null;
          performSave(pending.title, pending.cells, pending.completedBingos);
        }
      }
    },
    [],
  );

  // Watch for state changes and debounce saves
  // Skip the first trigger after hydration (LOAD_CARD sets state but shouldn't save)
  const lastSaveGenRef = useRef(0);
  useEffect(() => {
    if (!hydratedRef.current || !state.cardId) return;

    // Skip the state change caused by LOAD_CARD hydration
    if (lastSaveGenRef.current !== saveGenRef.current) {
      lastSaveGenRef.current = saveGenRef.current;
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      performSave(state.cardTitle, state.cells, state.completedBingos);
    }, 500);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [
    state.cells,
    state.cardTitle,
    state.completedBingos,
    state.cardId,
    performSave,
  ]);

  function handleCellClick(cellIndex: number) {
    const cell = state.cells[cellIndex];
    if (cell && !cell.isFreeSpace) {
      setSelectedCellIndex(cellIndex);
    }
  }

  function handleToggleCompletion(cellIndex: number) {
    dispatch({ type: "TOGGLE_COMPLETION", cellIndex });
  }

  function handleSaveNotes(notes: string) {
    if (selectedCellIndex !== null) {
      dispatch({ type: "UPDATE_NOTES", cellIndex: selectedCellIndex, notes });
    }
  }

  function handleUpdateGoalTitle(cellIndex: number, title: string) {
    dispatch({ type: "UPDATE_GOAL_TITLE", cellIndex, title });
  }

  function handleSelectCard(id: string) {
    setSidebarOpen(false);
    router.push(`/cards?id=${id}`);
  }

  async function handleDeleteCard(id: string) {
    try {
      await deleteCard(id);
      const remaining = sidebarCards.filter((c) => c._id !== id);
      setSidebarCards(remaining);

      if (id === card._id) {
        // Deleted the active card — navigate to next or empty
        if (remaining.length > 0) {
          router.push(`/cards?id=${remaining[0]._id}`);
        } else {
          router.push("/cards");
        }
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to delete card");
    }
  }

  // Keep sidebar title in sync with live edits
  useEffect(() => {
    if (!state.cardId || !state.cardTitle) return;
    setSidebarCards((prev) =>
      prev.map((c) =>
        c._id === state.cardId ? { ...c, title: state.cardTitle } : c,
      ),
    );
  }, [state.cardTitle, state.cardId]);

  // Wait for LOAD_CARD to hydrate
  if (!state.cardGenerated || state.cardId !== card._id) {
    return null;
  }

  const selectedCell =
    selectedCellIndex !== null ? state.cells[selectedCellIndex] : null;

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-50 rounded-lg bg-zinc-800 p-2 text-zinc-400 hover:text-foreground transition-colors"
        aria-label="Toggle sidebar"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path
            fillRule="evenodd"
            d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 fixed md:sticky top-0 left-0 z-40 h-screen w-64 shrink-0 border-r border-zinc-800 bg-zinc-900/95 backdrop-blur md:bg-transparent p-4 overflow-y-auto transition-transform duration-200`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
            My Cards
          </h2>
          <Link
            href="/"
            className="text-xs text-yellow-500 hover:text-yellow-400 transition-colors"
          >
            + New
          </Link>
        </div>
        <CardSidebar
          cards={sidebarCards}
          activeCardId={card._id ?? null}
          onSelectCard={handleSelectCard}
          onDeleteCard={handleDeleteCard}
        />
      </aside>

      {/* Backdrop for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-2xl flex flex-col gap-6">
          {/* Editable Title */}
          <div className="text-center">
            <CardTitleInput
              title={state.cardTitle}
              onChange={(title) => dispatch({ type: "SET_CARD_TITLE", title })}
              editable={true}
            />
            <p className="text-xs text-zinc-500 mt-1">
              Double-click a cell to edit its goal
            </p>
            <div className="h-4 mt-0.5">
              {saveError ? (
                <p className="text-xs text-red-400">{saveError}</p>
              ) : saveStatus === "saving" ? (
                <p className="text-xs text-zinc-500">Saving…</p>
              ) : saveStatus === "saved" ? (
                <p className="text-xs text-green-500">Saved</p>
              ) : null}
            </div>
          </div>

          {/* Bingo Counter */}
          <div className="flex justify-center">
            <BingoCounter
              count={state.completedBingos.length}
              total={TOTAL_BINGO_LINES}
            />
          </div>

          {/* Card Grid */}
          <BingoCard
            cells={state.cells}
            completedBingos={state.completedBingos}
            newBingos={state.newBingos}
            onCellClick={handleCellClick}
            onToggleCompletion={handleToggleCompletion}
            onUpdateGoalTitle={handleUpdateGoalTitle}
          />
        </div>

        {/* Cell Detail Modal */}
        <CellModal
          open={selectedCellIndex !== null}
          onClose={() => setSelectedCellIndex(null)}
          cell={selectedCell}
          onSaveNotes={handleSaveNotes}
        />
      </main>
    </div>
  );
}
