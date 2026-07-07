import { describe, expect, it } from "vitest";
import { createInMemoryStorage } from "@/lib/cardRepository";
import { getInitialTheme, persistTheme, toggleTheme } from "@/lib/theme";

describe("getInitialTheme", () => {
  it("defaults to dark when nothing is stored (preserves current appearance)", () => {
    const storage = createInMemoryStorage();
    expect(getInitialTheme(storage)).toBe("dark");
  });

  it("defaults to dark when storage is unavailable (SSR)", () => {
    expect(getInitialTheme(null)).toBe("dark");
  });

  it("returns the stored theme when it is a valid value", () => {
    const storage = createInMemoryStorage();
    storage.setItem("bingogen.theme.v1", "light");
    expect(getInitialTheme(storage)).toBe("light");
  });

  it("falls back to dark when the stored value is malformed", () => {
    const storage = createInMemoryStorage();
    storage.setItem("bingogen.theme.v1", "not-a-theme");
    expect(getInitialTheme(storage)).toBe("dark");
  });
});

describe("persistTheme", () => {
  it("writes the theme so it can be rehydrated on the next read", () => {
    const storage = createInMemoryStorage();
    persistTheme(storage, "light");
    expect(getInitialTheme(storage)).toBe("light");
  });

  it("is a no-op when storage is unavailable (SSR)", () => {
    expect(() => persistTheme(null, "light")).not.toThrow();
  });

  it("overwrites a previously persisted theme", () => {
    const storage = createInMemoryStorage();
    persistTheme(storage, "light");
    persistTheme(storage, "dark");
    expect(getInitialTheme(storage)).toBe("dark");
  });
});

describe("toggleTheme", () => {
  it("flips dark to light", () => {
    expect(toggleTheme("dark")).toBe("light");
  });

  it("flips light to dark", () => {
    expect(toggleTheme("light")).toBe("dark");
  });
});

describe("rehydration across a simulated reload", () => {
  it("persists a toggle and recovers it as the initial theme on the next load", () => {
    const storage = createInMemoryStorage();
    const initial = getInitialTheme(storage);
    expect(initial).toBe("dark");

    const toggled = toggleTheme(initial);
    persistTheme(storage, toggled);

    // Simulate a fresh page load reading from the same storage.
    expect(getInitialTheme(storage)).toBe("light");
  });
});
