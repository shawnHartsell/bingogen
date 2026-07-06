/**
 * Default card naming (US6): a freshly generated card gets a sensible,
 * unique-by-construction name derived from its creation time, so a user is
 * never forced to name a card before using it.
 */

/** e.g. "Card - Jul 6, 12:03" */
export function formatDefaultCardName(date: Date): string {
  const month = date.toLocaleString("en-US", { month: "short" });
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `Card - ${month} ${day}, ${hours}:${minutes}`;
}

/**
 * Returns a default name that does not collide with any existing name.
 * Appends " (2)", " (3)", ... if two cards are generated in the same minute.
 */
export function createUniqueDefaultName(
  date: Date,
  existingNames: Iterable<string>,
): string {
  const base = formatDefaultCardName(date);
  const taken = new Set(existingNames);
  if (!taken.has(base)) return base;

  let suffix = 2;
  while (taken.has(`${base} (${suffix})`)) {
    suffix++;
  }
  return `${base} (${suffix})`;
}
