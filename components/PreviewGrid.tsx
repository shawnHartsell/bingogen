"use client";

import { TOTAL_CELLS, FREE_SPACE_INDEX } from "@/lib/types";

interface PreviewGridProps {
  goals: string[];
  onRemove: (goalIndex: number) => void;
}

/**
 * A 5×5 preview grid shown during goal entry.
 * Fills cells sequentially (skipping the center free space) as goals are added.
 * Empty cells show a placeholder state.
 */
export function PreviewGrid({ goals, onRemove }: PreviewGridProps) {
  // Map each cell index (0–24) to either a goal or a placeholder.
  // Goals fill sequentially, skipping the free space at index 12.
  const cells: { goalIndex: number; text: string; isFreeSpace: boolean; isEmpty: boolean }[] = [];
  let goalIdx = 0;

  for (let i = 0; i < TOTAL_CELLS; i++) {
    const isFreeSpace = i === FREE_SPACE_INDEX;
    if (isFreeSpace) {
      cells.push({ goalIndex: -1, text: "FREE", isFreeSpace: true, isEmpty: false });
    } else if (goalIdx < goals.length) {
      cells.push({ goalIndex: goalIdx, text: goals[goalIdx], isFreeSpace: false, isEmpty: false });
      goalIdx++;
    } else {
      cells.push({ goalIndex: -1, text: "", isFreeSpace: false, isEmpty: true });
    }
  }

  return (
    <div className="grid grid-cols-5 gap-1.5 sm:gap-2 w-full max-w-[500px] mx-auto">
      {cells.map((cell, i) => (
        <div
          key={i}
          className={`
            relative flex items-center justify-center rounded-lg border p-1.5 sm:p-2
            aspect-square select-none overflow-hidden transition-colors duration-200
            ${cell.isFreeSpace
              ? "border-yellow-500/40 bg-yellow-500/10"
              : cell.isEmpty
                ? "border-zinc-800 bg-zinc-900/30 border-dashed"
                : "border-zinc-700 bg-zinc-900 group"
            }
          `}
        >
          {/* Remove button — shown on hover for filled goal cells */}
          {!cell.isFreeSpace && !cell.isEmpty && (
            <button
              onClick={() => onRemove(cell.goalIndex)}
              className="absolute top-0.5 right-0.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center
                text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-colors
                opacity-0 group-hover:opacity-100 focus:opacity-100 z-10 text-[10px] sm:text-xs"
              aria-label={`Remove "${cell.text}"`}
            >
              ×
            </button>
          )}

          <span
            className={`
              text-[10px] sm:text-xs leading-tight text-center break-words line-clamp-3
              ${cell.isFreeSpace ? "font-bold text-yellow-400 text-sm sm:text-base" : ""}
              ${cell.isEmpty ? "text-zinc-700 text-[9px] sm:text-[10px]" : "text-zinc-300"}
            `}
          >
            {cell.isFreeSpace
              ? "FREE"
              : cell.isEmpty
                ? `${i < FREE_SPACE_INDEX ? i + 1 : i}`
                : cell.text}
          </span>
        </div>
      ))}
    </div>
  );
}
