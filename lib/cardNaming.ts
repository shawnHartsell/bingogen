// Default, unique-by-construction card names derived from creation time, so a
// user is never forced to name a card before using it (US6).

const NAME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Formats a timestamp as "Card - Jul 6, 12:03". */
export function formatDefaultCardName(date: Date): string {
  return `Card - ${NAME_FORMATTER.format(date)}`;
}

/**
 * Builds a default card name that is guaranteed not to collide with any
 * `existingNames`, even if multiple cards are generated within the same
 * minute (falls back to a " (2)", " (3)", ... suffix).
 */
export function buildUniqueDefaultCardName(
  date: Date,
  existingNames: Iterable<string>,
): string {
  const taken = new Set(existingNames);
  const base = formatDefaultCardName(date);
  if (!taken.has(base)) return base;

  let suffix = 2;
  while (taken.has(`${base} (${suffix})`)) {
    suffix++;
  }
  return `${base} (${suffix})`;
}

/** Generates a stable, unique card id. */
export function generateCardId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID (e.g. older Node).
  return `card-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
