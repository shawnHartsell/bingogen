"use client";

import { useRouter } from "next/navigation";
import { useApp } from "@/components/AppProvider";

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
  const { cards, activeCardId, dispatch } = useApp();
  const router = useRouter();

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

  const list = (
    <ul className="flex flex-col gap-1">
      {cards.length === 0 && (
        <li className="text-xs text-zinc-500 px-2 py-1">No cards yet</li>
      )}
      {cards.map((card) => {
        const isActive = card.id === activeCardId;
        return (
          <li key={card.id}>
            <button
              type="button"
              onClick={() => handleSelect(card.id)}
              aria-current={isActive ? "true" : undefined}
              className={`w-full truncate rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                isActive
                  ? "bg-yellow-500/20 text-yellow-300 font-semibold"
                  : "text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {card.name}
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
