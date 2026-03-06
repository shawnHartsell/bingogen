"use client";

interface BingoCounterProps {
  count: number;
  total: number;
}

export function BingoCounter({ count, total }: BingoCounterProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={`font-mono font-semibold ${count > 0 ? "text-yellow-400" : "text-zinc-400"}`}
      >
        {count} / {total}
      </span>
      <span className="text-zinc-500">Bingos</span>
    </div>
  );
}
