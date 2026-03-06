"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import type { Cell } from "@/lib/types";
import { MAX_GOAL_LENGTH } from "@/lib/types";

interface BingoCellProps {
  cell: Cell;
  isInBingo: boolean;
  isNewBingo: boolean;
  onClick: () => void;
  onToggleCompletion: () => void;
  onUpdateGoalTitle?: (title: string) => void;
}

export function BingoCell({
  cell,
  isInBingo,
  isNewBingo,
  onClick,
  onToggleCompletion,
  onUpdateGoalTitle,
}: BingoCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  function handleDoubleClick(e: React.MouseEvent) {
    if (cell.isFreeSpace || !onUpdateGoalTitle) return;
    e.stopPropagation();
    setDraft(cell.goalTitle);
    setIsEditing(true);
  }

  function handleSave() {
    const trimmed = draft.trim();
    if (
      trimmed.length > 0 &&
      trimmed.length <= MAX_GOAL_LENGTH &&
      onUpdateGoalTitle
    ) {
      onUpdateGoalTitle(trimmed);
    }
    setIsEditing(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsEditing(false);
    }
  }

  return (
    <div
      className={`
        relative flex items-center justify-center rounded-lg border p-1.5 sm:p-2
        aspect-square cursor-pointer select-none overflow-hidden
        transition-colors duration-200
        ${isNewBingo ? "animate-bingo-glow" : ""}
        ${
          cell.isCompleted
            ? isInBingo
              ? "border-yellow-500/60 bg-yellow-500/15"
              : "border-emerald-500/50 bg-emerald-500/10"
            : "border-zinc-700 bg-zinc-900 hover:bg-zinc-800/80"
        }
        ${cell.isFreeSpace ? "border-yellow-500/40 bg-yellow-500/10" : ""}
      `}
      onClick={onClick}
      onDoubleClick={handleDoubleClick}
    >
      {/* Completion checkbox — separate click target */}
      {!cell.isFreeSpace && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleCompletion();
          }}
          className={`
            absolute top-1 right-1 w-4 h-4 sm:w-5 sm:h-5 rounded border flex items-center justify-center
            transition-colors z-10 text-[10px] sm:text-xs
            ${
              cell.isCompleted
                ? "bg-emerald-500 border-emerald-400 text-white"
                : "border-zinc-600 hover:border-zinc-400"
            }
          `}
          aria-label={`Mark "${cell.goalTitle}" as ${cell.isCompleted ? "incomplete" : "complete"}`}
        >
          {cell.isCompleted && "✓"}
        </button>
      )}

      {/* Note indicator */}
      {!cell.isFreeSpace && cell.notes.length > 0 && !isEditing && (
        <span
          className="absolute bottom-1 right-1 text-[10px] sm:text-xs text-zinc-500"
          aria-label="Has notes"
        >
          📝
        </span>
      )}

      {/* Cell content — inline editing or display */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          maxLength={MAX_GOAL_LENGTH}
          className="w-full bg-zinc-800 border border-yellow-500/50 rounded px-1 py-0.5
            text-[10px] sm:text-xs text-center text-zinc-100
            focus:outline-none focus:ring-1 focus:ring-yellow-400/50"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          className={`
            text-[10px] sm:text-xs leading-tight text-center break-words line-clamp-3
            ${cell.isFreeSpace ? "font-bold text-yellow-400 text-sm sm:text-base" : ""}
            ${cell.isCompleted && !cell.isFreeSpace ? "text-emerald-300" : ""}
          `}
        >
          {cell.goalTitle}
        </span>
      )}
    </div>
  );
}
