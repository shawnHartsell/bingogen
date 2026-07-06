import { describe, expect, it } from "vitest";
import { createUniqueDefaultName, formatDefaultCardName } from "@/lib/cardName";

describe("formatDefaultCardName", () => {
  it("formats as 'Card - Mon D, HH:MM'", () => {
    const date = new Date(2026, 6, 6, 12, 3); // Jul 6, 12:03 local time
    expect(formatDefaultCardName(date)).toBe("Card - Jul 6, 12:03");
  });

  it("zero-pads single-digit hours and minutes", () => {
    const date = new Date(2026, 0, 1, 9, 5);
    expect(formatDefaultCardName(date)).toBe("Card - Jan 1, 09:05");
  });
});

describe("createUniqueDefaultName", () => {
  it("returns the base name when there is no collision", () => {
    const date = new Date(2026, 6, 6, 12, 3);
    expect(createUniqueDefaultName(date, [])).toBe("Card - Jul 6, 12:03");
  });

  it("appends a numeric suffix to avoid colliding with existing names", () => {
    const date = new Date(2026, 6, 6, 12, 3);
    const existing = ["Card - Jul 6, 12:03"];
    expect(createUniqueDefaultName(date, existing)).toBe(
      "Card - Jul 6, 12:03 (2)",
    );
  });

  it("keeps incrementing the suffix until it finds a free name", () => {
    const date = new Date(2026, 6, 6, 12, 3);
    const existing = [
      "Card - Jul 6, 12:03",
      "Card - Jul 6, 12:03 (2)",
      "Card - Jul 6, 12:03 (3)",
    ];
    expect(createUniqueDefaultName(date, existing)).toBe(
      "Card - Jul 6, 12:03 (4)",
    );
  });
});
