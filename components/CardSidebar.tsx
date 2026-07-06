"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp, type CardSummary } from "@/components/AppProvider";

/**
 * Persistent, always-mounted (not a modal) surface listing every saved
 * card by name, showing which one is active, and offering a "New card"
 * action. Selecting a card swaps the active card in place (no route
 * change beyond returning to /card, where the swapped-in card renders).
 *
 * On narrow viewports this collapses into a native <details> drawer so it
 * never competes with the board for space, without any extra JS.
 */
export function CardSidebar() {
  const { cards, activeCardId, dispatch, renameError } = useApp();
  const router = useRouter();

  // Rename (US10): at most one card is being renamed at a time. `hasSubmitted`
  // distinguishes "just opened the editor" from "actually tried to save",
  // so a stale error from a previous attempt never shows before the user
  // submits again.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close the editor once a submitted rename is no longer rejected (i.e. it
  // was accepted, or was a no-op rename to the same name). This mirrors
  // React's documented "adjust state while rendering" pattern rather than
  // an effect, since it's reacting to props/context that changed as a
  // direct result of the render that's currently happening.
  if (
    editingId &&
    hasSubmitted &&
    !(renameError && renameError.id === editingId)
  ) {
    setEditingId(null);
    setHasSubmitted(false);
  }

  useEffect(() => {
    if (editingId) inputRef.current?.focus();
  }, [editingId]);

  function handleSelect(id: string) {
    if (id !== activeCardId) {
      dispatch({ type: "SET_ACTIVE_CARD", id });
    }
    router.push("/card");
  }

  function handleNewCard() {
    dispatch({ type: "NEW_CARD" });
    router.push("/");
  }

  function startRename(card: CardSummary) {
    setEditingId(card.id);
    setDraftName(card.name);
    setHasSubmitted(false);
  }

  function cancelRename() {
    setEditingId(null);
    setDraftName("");
    setHasSubmitted(false);
  }

  function submitRename(id: string) {
    setHasSubmitted(true);
    dispatch({ type: "RENAME_CARD", id, name: draftName });
  }

  const showError = (id: string) =>
    hasSubmitted && renameError?.id === id ? renameError.message : null;

  const list = (
    <ul className="flex flex-col gap-1">
      {cards.length === 0 && (
        <li className="text-xs text-zinc-500 px-2 py-1">No cards yet</li>
      )}
      {cards.map((card) => {
        const isActive = card.id === activeCardId;
        const isEditing = editingId === card.id;
        const error = showError(card.id);

        if (isEditing) {
          return (
            <li key={card.id} className="px-2 py-1">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitRename(card.id);
                }}
                className="flex flex-col gap-1"
              >
                <div className="flex gap-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") cancelRename();
                    }}
                    aria-invalid={error ? "true" : undefined}
                    aria-label={`Rename ${card.name}`}
                    className={`min-w-0 flex-1 rounded-md border bg-zinc-900 px-2 py-1 text-sm text-zinc-100 ${
                      error ? "border-red-500" : "border-zinc-700"
                    }`}
                  />
                  <button
                    type="submit"
                    className="rounded-md bg-yellow-500/20 px-2 py-1 text-xs font-semibold text-yellow-300 hover:bg-yellow-500/30"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={cancelRename}
                    className="rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                </div>
                {error && (
                  <p role="alert" className="px-1 text-xs text-red-400">
                    {error}
                  </p>
                )}
              </form>
            </li>
          );
        }

        return (
          <li key={card.id} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleSelect(card.id)}
              aria-current={isActive ? "true" : undefined}
              className={`min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                isActive
                  ? "bg-yellow-500/20 text-yellow-300 font-semibold"
                  : "text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {card.name}
            </button>
            <button
              type="button"
              onClick={() => startRename(card)}
              aria-label={`Rename ${card.name}`}
              title="Rename"
              className="shrink-0 rounded-md px-1.5 py-1 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
            >
              ✏️
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      {/* Narrow viewports: collapsible drawer above the content. */}
      <details className="sm:hidden border-b border-zinc-800 bg-zinc-950">
        <summary className="cursor-pointer select-none px-4 py-2 text-sm font-semibold text-zinc-300">
          Your cards ({cards.length})
        </summary>
        <div className="px-4 pb-3">
          <button
            type="button"
            onClick={handleNewCard}
            className="mb-2 w-full rounded-md border border-yellow-500/50 py-1.5 text-xs font-bold text-yellow-400 hover:bg-yellow-500/10 transition-colors"
          >
            + New card
          </button>
          {list}
        </div>
      </details>

      {/* Wide viewports: persistent sidebar beside the board. */}
      <aside className="hidden sm:flex sm:flex-col sm:w-56 sm:shrink-0 sm:border-r sm:border-zinc-800 sm:min-h-screen sm:px-3 sm:py-6 sm:gap-3">
        <h2 className="px-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
          Your cards
        </h2>
        <button
          type="button"
          onClick={handleNewCard}
          className="w-full rounded-md border border-yellow-500/50 py-1.5 text-xs font-bold text-yellow-400 hover:bg-yellow-500/10 transition-colors"
        >
          + New card
        </button>
        {list}
      </aside>
    </>
  );
}
