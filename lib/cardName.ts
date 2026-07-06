/**
 * Default, unique-by-construction card naming (US6).
 *
 * A freshly generated card gets a sensible name derived from its creation
 * time (e.g. "Card - Jul 6, 12:03") so a user is never forced to name a card
 * before using it. Because two cards can be generated within the same
 * minute, `generateDefaultCardName` disambiguates against the set of names
 * already in use so fresh cards never collide.
 */

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function formatTimestamp(date: Date): string {
  const month = MONTHS[date.getMonth()];
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `Card - ${month} ${day}, ${hours}:${minutes}`;
}

/**
 * Builds a default card name from `date`, disambiguating against
 * `existingNames` (e.g. names of every other card already in the
 * collection) so the result is guaranteed unique.
 */
export function generateDefaultCardName(
  existingNames: Iterable<string>,
  date: Date = new Date(),
): string {
  const taken = new Set(existingNames);
  const base = formatTimestamp(date);

  if (!taken.has(base)) {
    return base;
  }

  // Same-minute collision: disambiguate with seconds, then a counter suffix.
  const seconds = date.getSeconds().toString().padStart(2, "0");
  const withSeconds = `${base}:${seconds}`;
  if (!taken.has(withSeconds)) {
    return withSeconds;
  }

  let counter = 2;
  let candidate = `${withSeconds} (${counter})`;
  while (taken.has(candidate)) {
    counter++;
    candidate = `${withSeconds} (${counter})`;
  }
  return candidate;
}
