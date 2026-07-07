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

  // Delete (US11): a lightweight inline confirmation guards the delete so a
  // misclick can't wipe a card. Only one card's confirmation is open at a
  // time; clicking delete on another card, or cancelling, closes it.
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null,
  );

  function requestDelete(id: string) {
    setConfirmingDeleteId(id);
  }

  function cancelDelete() {
    setConfirmingDeleteId(null);
  }

  function confirmDelete(id: string) {
    dispatch({ type: "DELETE_CARD", id });
    setConfirmingDeleteId(null);
    // No manual navigation needed: the route guards on "/" and "/card"
    // already react to activeCardId/cardGenerated changes (redirecting to
    // "/" if no card remains active, or staying put if another card was
    // promoted to active).
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
        const isConfirmingDelete = confirmingDeleteId === card.id;
        const error = showError(card.id);

        if (isConfirmingDelete) {
          return (
            <li
              key={card.id}
              className="flex flex-col gap-1 rounded-md border border-red-500/40 bg-red-500/5 px-2 py-1.5"
            >
              <p className="truncate text-sm text-zinc-800 dark:text-zinc-200">
                Delete <span className="font-semibold">{card.name}</span>?
              </p>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => confirmDelete(card.id)}
                  className="rounded-md bg-red-500/20 px-2 py-1 text-xs font-semibold text-red-700 dark:text-red-300 hover:bg-red-500/30"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={cancelDelete}
                  className="rounded-md px-2 py-1 text-xs text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
              </div>
            </li>
          );
        }

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
                    className={`min-w-0 flex-1 rounded-md border bg-white dark:bg-zinc-900 px-2 py-1 text-sm text-zinc-900 dark:text-zinc-100 ${
                      error ? "border-red-500" : "border-zinc-300 dark:border-zinc-700"
                    }`}
                  />
                  <button
                    type="submit"
                    className="rounded-md bg-yellow-500/20 px-2 py-1 text-xs font-semibold text-yellow-700 dark:text-yellow-300 hover:bg-yellow-500/30"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={cancelRename}
                    className="rounded-md px-2 py-1 text-xs text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
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
                  ? "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 font-semibold"
                  : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800"
              }`}
            >
              {card.name}
            </button>
            <button
              type="button"
              onClick={() => startRename(card)}
              aria-label={`Rename ${card.name}`}
              title="Rename"
              className="shrink-0 rounded-md px-1.5 py-1 text-xs text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              ✏️
            </button>
            <button
              type="button"
              onClick={() => requestDelete(card.id)}
              aria-label={`Delete ${card.name}`}
              title="Delete"
              className="shrink-0 rounded-md px-1.5 py-1 text-xs text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
            >
              🗑️
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      {/* Narrow viewports: collapsible drawer above the content. */}
      <details className="sm:hidden border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
        <summary className="cursor-pointer select-none px-4 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Your cards ({cards.length})
        </summary>
        <div className="px-4 pb-3">
          <button
            type="button"
            onClick={handleNewCard}
            className="mb-2 w-full rounded-md border border-yellow-500/50 py-1.5 text-xs font-bold text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/10 transition-colors"
          >
            + New card
          </button>
          {list}
        </div>
      </details>

      {/* Wide viewports: persistent sidebar beside the board. */}
      <aside className="hidden sm:flex sm:flex-col sm:w-56 sm:shrink-0 sm:border-r sm:border-zinc-200 dark:sm:border-zinc-800 sm:min-h-screen sm:px-3 sm:py-6 sm:gap-3">
        <h2 className="px-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
          Your cards
        </h2>
        <button
          type="button"
          onClick={handleNewCard}
          className="w-full rounded-md border border-yellow-500/50 py-1.5 text-xs font-bold text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/10 transition-colors"
        >
          + New card
        </button>
        {list}
      </aside>
    </>
  );
}
