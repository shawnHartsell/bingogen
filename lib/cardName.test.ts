import { describe, it, expect } from "vitest";
import { generateDefaultCardName } from "./cardName";

describe("generateDefaultCardName", () => {
  it("derives a name from the creation time", () => {
    const date = new Date(2026, 6, 6, 12, 3); // Jul 6, 12:03
    expect(generateDefaultCardName([], date)).toBe("Card - Jul 6, 12:03");
  });

  it("disambiguates same-minute collisions with seconds", () => {
    const date = new Date(2026, 6, 6, 12, 3, 45);
    const base = generateDefaultCardName([], date);
    const disambiguated = generateDefaultCardName([base], date);
    expect(disambiguated).not.toBe(base);
    expect(disambiguated).toBe("Card - Jul 6, 12:03:45");
  });

  it("falls back to a counter suffix when even seconds collide", () => {
    const date = new Date(2026, 6, 6, 12, 3, 45);
    const base = generateDefaultCardName([], date);
    const withSeconds = generateDefaultCardName([base], date);
    const third = generateDefaultCardName([base, withSeconds], date);
    expect(third).toBe("Card - Jul 6, 12:03:45 (2)");
  });

  it("never collides with existing names across many generations", () => {
    const date = new Date(2026, 6, 6, 12, 3, 45);
    const names: string[] = [];
    for (let i = 0; i < 5; i++) {
      const name = generateDefaultCardName(names, date);
      expect(names).not.toContain(name);
      names.push(name);
    }
    expect(new Set(names).size).toBe(names.length);
  });
});
