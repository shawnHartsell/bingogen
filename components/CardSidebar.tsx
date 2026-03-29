"use client";

import type { CardListItem } from "@/lib/types";
import { useState } from "react";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";

interface CardSidebarProps {
  cards: CardListItem[];
  activeCardId: string | null;
  onSelectCard: (id: string) => void;
  onDeleteCard: (id: string) => void;
}

export function CardSidebar({
  cards,
  activeCardId,
  onSelectCard,
  onDeleteCard,
}: CardSidebarProps) {
  const [deleteTarget, setDeleteTarget] = useState<CardListItem | null>(null);

  return (
    <>
      <nav className="flex flex-col gap-1">
        {cards.map((card) => (
          <div
            key={card._id}
            className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer ${
              card._id === activeCardId
                ? "bg-zinc-800 text-foreground"
                : "text-zinc-400 hover:bg-zinc-800/50 hover:text-foreground"
            }`}
            onClick={() => onSelectCard(card._id)}
          >
            <span className="flex-1 truncate">{card.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget(card);
              }}
              className="opacity-0 group-hover:opacity-100 shrink-0 rounded p-1 text-zinc-500 hover:text-red-400 hover:bg-zinc-700 transition-all"
              aria-label={`Delete ${card.title}`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="w-3.5 h-3.5"
              >
                <path
                  fillRule="evenodd"
                  d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5A.75.75 0 0 1 9.95 6Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        ))}
      </nav>

      <DeleteConfirmDialog
        isOpen={deleteTarget !== null}
        cardTitle={deleteTarget?.title ?? ""}
        onConfirm={() => {
          if (deleteTarget) {
            onDeleteCard(deleteTarget._id);
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
