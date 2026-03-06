"use client";

import { useRef, useEffect, useState } from "react";
import type { Cell } from "@/lib/types";
import { MarkdownPreview } from "@/components/MarkdownPreview";
import { MarkdownEditor } from "@/components/MarkdownEditor";

interface CellModalProps {
  open: boolean;
  onClose: () => void;
  cell: Cell | null;
  onSaveNotes: (notes: string) => void;
}

export function CellModal({
  open,
  onClose,
  cell,
  onSaveNotes,
}: CellModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState("");

  // Sync dialog open/close with the `open` prop
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Load draft when cell changes or modal opens
  useEffect(() => {
    if (open && cell) {
      setDraft(cell.notes);
    }
  }, [open, cell]);

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === e.currentTarget) {
      handleSave();
    }
  }

  function handleSave() {
    onSaveNotes(draft);
    onClose();
  }

  if (!cell) return null;

  return (
    <dialog
      ref={dialogRef}
      onClose={handleSave}
      onClick={handleBackdropClick}
      className="backdrop:bg-black/60 bg-transparent p-0 max-w-lg w-[calc(100%-2rem)] rounded-xl outline-none fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0"
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 sm:p-6 flex flex-col gap-4 max-h-[80vh] overflow-y-auto text-zinc-100">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold leading-tight break-words flex-1 text-zinc-100">
            {cell.goalTitle}
          </h2>
          <button
            onClick={handleSave}
            className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
            Notes
          </p>
          <div className="flex flex-col gap-3">
            <MarkdownEditor value={draft} onChange={setDraft} />
            {/* Live preview */}
            <div className="border-t border-zinc-700 pt-3">
              <p className="text-xs text-zinc-500 mb-2">Preview</p>
              <MarkdownPreview content={draft} onContentChange={setDraft} />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={handleSave}
            className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-yellow-400 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </dialog>
  );
}
