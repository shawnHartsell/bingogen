import type { CardRepository, PersistedCard } from "./types";

/**
 * In-memory {@link CardRepository} implementation used by the unit-test
 * harness to exercise the repository contract without touching a real
 * browser `localStorage`.
 */
export class InMemoryCardRepository implements CardRepository {
  private cards = new Map<string, PersistedCard>();
  private activeCardId: string | null = null;

  async list(): Promise<PersistedCard[]> {
    return Array.from(this.cards.values());
  }

  async load(id: string): Promise<PersistedCard | null> {
    return this.cards.get(id) ?? null;
  }

  async save(card: PersistedCard): Promise<void> {
    this.cards.set(card.id, card);
  }

  async delete(id: string): Promise<void> {
    this.cards.delete(id);
    if (this.activeCardId === id) this.activeCardId = null;
  }

  async getActiveCardId(): Promise<string | null> {
    return this.activeCardId;
  }

  async setActiveCardId(id: string | null): Promise<void> {
    this.activeCardId = id;
  }
}
