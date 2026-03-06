"use client";

import { useRouter } from "next/navigation";
import { useApp } from "@/components/AppProvider";
import { GoalInput } from "@/components/GoalInput";
import { GoalCounter } from "@/components/GoalCounter";
import { PreviewGrid } from "@/components/PreviewGrid";
import { GOALS_REQUIRED } from "@/lib/types";

export default function GoalEntryPage() {
  const { state, dispatch } = useApp();
  const router = useRouter();

  const isReady = state.goals.length === GOALS_REQUIRED;

  function handleGenerate() {
    dispatch({ type: "GENERATE_CARD" });
    router.push("/card");
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

        {/* Counter */}
        <div className="flex justify-center">
          <GoalCounter current={state.goals.length} target={GOALS_REQUIRED} />
        </div>

        {/* Input */}
        <div className="max-w-lg mx-auto w-full">
          <GoalInput
            onAdd={(goal) => dispatch({ type: "ADD_GOAL", goal })}
            disabled={isReady}
          />
        </div>

        {/* Progressive Preview Grid */}
        <PreviewGrid
          goals={state.goals}
          onRemove={(index) => dispatch({ type: "REMOVE_GOAL", index })}
        />

        {/* Create Card Button */}
        <div className="max-w-lg mx-auto w-full">
          <button
            onClick={handleGenerate}
            disabled={!isReady}
            className="w-full rounded-lg bg-yellow-500 py-3 text-sm font-bold text-zinc-900 hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Create Card
          </button>
        </div>
      </div>
    </main>
  );
}
