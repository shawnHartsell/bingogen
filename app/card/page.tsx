"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/AppProvider";
import { BingoCard } from "@/components/BingoCard";
import { BingoCounter } from "@/components/BingoCounter";
import { CellModal } from "@/components/CellModal";
import { getActiveCard } from "@/lib/appReducer";
import { TOTAL_BINGO_LINES } from "@/lib/types";

export default function CardPage() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const [selectedCellIndex, setSelectedCellIndex] = useState<number | null>(
    null,
  );
  const activeCard = getActiveCard(state);

  // Route guard: redirect to goal entry if there's no active card. Wait
  // until the collection has rehydrated so a fresh reload isn't bounced
  // to "/" before the persisted active card has a chance to load.
  useEffect(() => {
    if (state.hydrated && !activeCard) {
      router.replace("/");
    }
  }, [state.hydrated, activeCard, router]);

  function handleCellClick(cellIndex: number) {
    const cell = activeCard?.cells[cellIndex];
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

  if (!activeCard) {
    return null;
  }

  const selectedCell =
    selectedCellIndex !== null ? activeCard.cells[selectedCellIndex] : null;

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {activeCard.name}
          </h1>
          <p className="text-xs text-zinc-500">
            Double-click a cell to edit its goal
          </p>
        </div>

        {/* Bingo Counter */}
        <div className="flex justify-center">
          <BingoCounter
            count={activeCard.completedBingos.length}
            total={TOTAL_BINGO_LINES}
          />
        </div>

        {/* Card Grid */}
        <BingoCard
          cells={activeCard.cells}
          completedBingos={activeCard.completedBingos}
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
  );
}
