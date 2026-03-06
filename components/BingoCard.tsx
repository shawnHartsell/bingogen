"use client";

import type { Cell } from "@/lib/types";
import { BINGO_LINES } from "@/lib/bingo";
import { BingoCell } from "@/components/BingoCell";

interface BingoCardProps {
  cells: Cell[];
  completedBingos: number[];
  newBingos: number[];
  onCellClick: (cellIndex: number) => void;
  onToggleCompletion: (cellIndex: number) => void;
  onUpdateGoalTitle?: (cellIndex: number, title: string) => void;
}

export function BingoCard({
  cells,
  completedBingos,
  newBingos,
  onCellClick,
  onToggleCompletion,
  onUpdateGoalTitle,
}: BingoCardProps) {
  // Precompute per-cell flags
  const cellInBingo = new Set<number>();
  for (const lineIdx of completedBingos) {
    for (const cellIdx of BINGO_LINES[lineIdx]) {
      cellInBingo.add(cellIdx);
    }
  }

  const cellInNewBingo = new Set<number>();
  for (const lineIdx of newBingos) {
    for (const cellIdx of BINGO_LINES[lineIdx]) {
      cellInNewBingo.add(cellIdx);
    }
  }

  return (
    <div className="grid grid-cols-5 gap-1.5 sm:gap-2 w-full max-w-[500px] mx-auto">
      {cells.map((cell, i) => (
        <BingoCell
          key={i}
          cell={cell}
          isInBingo={cellInBingo.has(i)}
          isNewBingo={cellInNewBingo.has(i)}
          onClick={() => onCellClick(i)}
          onToggleCompletion={() => onToggleCompletion(i)}
          onUpdateGoalTitle={
            onUpdateGoalTitle
              ? (title) => onUpdateGoalTitle(i, title)
              : undefined
          }
        />
      ))}
    </div>
  );
}
