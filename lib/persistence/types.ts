import type { Cell } from "@/lib/types";

// ─── Contract ─────────────────────────────────────────────
// Single source of truth for the persisted card shape and the repository
// interface. A later verify-integration pass targets this file directly.

/** Bump whenever the persisted shape changes in a backward-incompatible way. */
export const CARD_SCHEMA_VERSION = 1;

/** A full, durable snapshot of one bingo card. */
export interface PersistedCard {
  id: string;
  name: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  schemaVersion: number;
  cells: Cell[];
  completedBingos: number[];
}

/**
 * Async persistence port. The contract is Promise-returning from day one so a
 * future API/DB backend is a pure implementation swap, even though today's
 * only implementation is backed by synchronous `localStorage`.
 */
export interface CardRepository {
  list(): Promise<PersistedCard[]>;
  load(id: string): Promise<PersistedCard | null>;
  save(card: PersistedCard): Promise<void>;
  delete(id: string): Promise<void>;
  getActiveCardId(): Promise<string | null>;
  setActiveCardId(id: string | null): Promise<void>;
}

/**
 * Thrown when a write cannot be committed to the backing store (e.g. the
 * browser's `QuotaExceededError`). Callers must not treat a failed save as a
 * silent no-op.
 */
export class PersistenceWriteError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "PersistenceWriteError";
    this.cause = cause;
  }
}
