"use client";

import { useEffect, useRef } from "react";

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  cardTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmDialog({
  isOpen,
  cardTitle,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onCancel();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  return (
    <dialog
      ref={dialogRef}
      className="m-auto bg-zinc-900 border border-zinc-700 rounded-xl p-6 text-foreground backdrop:bg-black/60 max-w-sm w-full"
      onClick={(e) => {
        if (e.target === dialogRef.current) {
          onCancel();
        }
      }}
    >
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">Delete Card</h2>
        <p className="text-sm text-zinc-400">
          Delete &ldquo;{cardTitle}&rdquo;? This cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 hover:text-foreground hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg px-4 py-2 text-sm font-bold bg-red-600 text-white hover:bg-red-500 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </dialog>
  );
}
