"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/AppProvider";
import { GoalInput } from "@/components/GoalInput";
import { GoalCounter } from "@/components/GoalCounter";
import { PreviewGrid } from "@/components/PreviewGrid";
import { CardTitleInput } from "@/components/CardTitleInput";
import { createCard } from "@/lib/cards";
import { GOALS_REQUIRED } from "@/lib/types";

export default function GoalEntryPage() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when entering goal entry page for a fresh card
  useEffect(() => {
    if (state.cardId) {
      dispatch({ type: "RESET" });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isReady =
    state.goals.length === GOALS_REQUIRED && state.cardTitle.trim().length > 0;

  async function handleGenerate() {
    if (!isReady) return;

    dispatch({ type: "GENERATE_CARD" });

    // Need to build cells from current state to pass to server action
    // The reducer has already built them — but we need the result.
    // We dispatch first, then read from the updated state via a workaround:
    // Instead, build cells inline to pass to createCard immediately.
    setSaving(true);
    setError(null);

    try {
      // Dispatch generates the card in state
      // But we need the cells right now for the server action.
      // Build them the same way the reducer does.
      const { buildCellsFromGoals } = await import("@/components/AppProvider");
      const cells = buildCellsFromGoals(state.goals);

      const { id } = await createCard({
        title: state.cardTitle.trim(),
        cells,
        completedBingos: [],
      });
      router.push(`/cards?id=${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save card");
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            BingoGen
          </h1>
          <p className="text-sm text-zinc-500">
            Enter 24 yearly goals to create your bingo card
          </p>
        </div>

        {/* Card Title */}
        <div className="max-w-lg mx-auto w-full">
          <label className="block text-xs text-zinc-500 text-center mb-1">
            Card title <span className="text-red-400">*</span>
          </label>
          <CardTitleInput
            title={state.cardTitle}
            onChange={(title) => dispatch({ type: "SET_CARD_TITLE", title })}
            editable={false}
          />
        </div>

        {/* Counter */}
        <div className="flex justify-center">
          <GoalCounter current={state.goals.length} target={GOALS_REQUIRED} />
        </div>

        {/* Input */}
        <div className="max-w-lg mx-auto w-full">
          <GoalInput
            onAdd={(goal) => dispatch({ type: "ADD_GOAL", goal })}
            disabled={state.goals.length >= GOALS_REQUIRED}
          />
        </div>

        {/* Progressive Preview Grid */}
        <PreviewGrid
          goals={state.goals}
          onRemove={(index) => dispatch({ type: "REMOVE_GOAL", index })}
        />

        {/* Error */}
        {error && <p className="text-center text-sm text-red-400">{error}</p>}

        {/* Create Card Button */}
        <div className="max-w-lg mx-auto w-full">
          <button
            onClick={handleGenerate}
            disabled={!isReady || saving}
            className="w-full rounded-lg bg-yellow-500 py-3 text-sm font-bold text-zinc-900 hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving…" : "Create Card"}
          </button>
        </div>
      </div>
    </main>
  );
}
