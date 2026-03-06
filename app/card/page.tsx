"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/AppProvider";
import { BingoCard } from "@/components/BingoCard";
import { BingoCounter } from "@/components/BingoCounter";
import { CellModal } from "@/components/CellModal";
import { TOTAL_BINGO_LINES } from "@/lib/types";

export default function CardPage() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const [selectedCellIndex, setSelectedCellIndex] = useState<number | null>(
    null,
  );

  // Route guard: redirect to goal entry if no card generated
  useEffect(() => {
    if (!state.cardGenerated) {
      router.replace("/");
    }
  }, [state.cardGenerated, router]);

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

  if (!state.cardGenerated) {
    return null;
  }

  const selectedCell =
    selectedCellIndex !== null ? state.cells[selectedCellIndex] : null;

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Your Bingo Card
          </h1>
          <p className="text-xs text-zinc-500">
            Double-click a cell to edit its goal
          </p>
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
  );
}
