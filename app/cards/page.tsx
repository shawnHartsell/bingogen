import { getCard, listCards } from "@/lib/cards";
import type { CardListItem, BingoCardDocument } from "@/lib/types";
import { CardViewClient } from "./CardViewClient";
import Link from "next/link";

interface CardsPageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function CardsPage({ searchParams }: CardsPageProps) {
  const params = await searchParams;
  const allCards: CardListItem[] = await listCards();

  // Empty state: no cards exist
  if (allCards.length === 0) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold tracking-tight">No Cards Yet</h1>
          <p className="text-zinc-500">
            Create your first bingo card to get started.
          </p>
          <Link
            href="/"
            className="inline-block rounded-lg bg-yellow-500 px-6 py-3 text-sm font-bold text-zinc-900 hover:bg-yellow-400 transition-colors"
          >
            Create a Card
          </Link>
        </div>
      </main>
    );
  }

  // Determine which card to load
  const targetId = params.id ?? allCards[0]._id;
  let card: BingoCardDocument | null = null;

  if (targetId) {
    card = await getCard(targetId);
  }

  // Card not found state
  if (!card) {
    return (
      <main className="min-h-screen flex items-start px-4 py-8">
        <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold tracking-tight">
              Card Not Found
            </h1>
            <p className="text-zinc-500">
              The card you&apos;re looking for doesn&apos;t exist or has been
              deleted.
            </p>
            <Link
              href="/"
              className="inline-block rounded-lg bg-yellow-500 px-6 py-3 text-sm font-bold text-zinc-900 hover:bg-yellow-400 transition-colors"
            >
              Create a New Card
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return <CardViewClient card={card} allCards={allCards} />;
}
