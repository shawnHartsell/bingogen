// ─── Default Card Naming ──────────────────────────────────
// A freshly generated card gets a sensible default name derived from its
// creation time (e.g. "Card - Jul 6, 12:03:45 PM"), so a user is never
// forced to name a card before using it. Seconds are included (rather
// than stopping at minute precision) so the name is unique-by-construction:
// two cards can only collide if generated within the same second, which
// isn't reachable through the UI (each card requires entering 24 goals
// first).
export function defaultCardName(createdAt: Date): string {
  const datePart = createdAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const timePart = createdAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
  return `Card - ${datePart}, ${timePart}`;
}
