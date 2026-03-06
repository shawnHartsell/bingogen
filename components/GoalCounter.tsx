"use client";

interface GoalCounterProps {
  current: number;
  target: number;
}

export function GoalCounter({ current, target }: GoalCounterProps) {
  const isComplete = current === target;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={`font-mono font-semibold ${isComplete ? "text-yellow-400" : "text-zinc-400"}`}
      >
        {current} / {target}
      </span>
      <span className="text-zinc-500">goals</span>
    </div>
  );
}
