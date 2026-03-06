"use client";

import { useState, type KeyboardEvent } from "react";
import { MAX_GOAL_LENGTH } from "@/lib/types";

interface GoalInputProps {
  onAdd: (goal: string) => void;
  disabled: boolean;
  maxLength?: number;
}

export function GoalInput({
  onAdd,
  disabled,
  maxLength = MAX_GOAL_LENGTH,
}: GoalInputProps) {
  const [value, setValue] = useState("");

  const trimmed = value.trim();
  const canSubmit =
    !disabled && trimmed.length > 0 && trimmed.length <= maxLength;
  const isOverLimit = trimmed.length > maxLength;

  function handleSubmit() {
    if (!canSubmit) return;
    onAdd(trimmed);
    setValue("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={disabled ? "24 goals reached!" : "Enter a goal…"}
          maxLength={maxLength + 10} // Allow typing slightly over to show error
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-foreground placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="rounded-lg bg-yellow-500 px-5 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Add
        </button>
      </div>
      {isOverLimit && (
        <p className="text-xs text-red-400">
          Goal must be {maxLength} characters or fewer ({trimmed.length}/
          {maxLength})
        </p>
      )}
    </div>
  );
}
