"use client";

import { MAX_NOTES_LENGTH } from "@/lib/types";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}

export function MarkdownEditor({
  value,
  onChange,
  maxLength = MAX_NOTES_LENGTH,
}: MarkdownEditorProps) {
  const remaining = maxLength - value.length;
  const isNearLimit = remaining <= 50;
  const isAtLimit = remaining <= 0;

  return (
    <div className="flex flex-col gap-1.5">
      <textarea
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          if (next.length <= maxLength) {
            onChange(next);
          }
        }}
        maxLength={maxLength}
        rows={6}
        placeholder="Write Markdown notes… (supports checklists: - [ ] item)"
        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-foreground placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 resize-y font-mono"
      />
      <div className="flex justify-end">
        <span
          className={`text-xs ${
            isAtLimit
              ? "text-red-400 font-semibold"
              : isNearLimit
                ? "text-yellow-400"
                : "text-zinc-500"
          }`}
        >
          {value.length} / {maxLength}
        </span>
      </div>
    </div>
  );
}
