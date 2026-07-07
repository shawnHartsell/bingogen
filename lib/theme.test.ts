import { describe, expect, it } from "vitest";
import { createInMemoryStorage } from "@/lib/cardRepository";
import { DEFAULT_THEME, readTheme, toggleTheme, writeTheme } from "@/lib/theme";

describe("theme persistence (in-memory backing)", () => {
  it("defaults to dark when nothing has been saved", () => {
    const storage = createInMemoryStorage();
    expect(readTheme(storage)).toBe("dark");
    expect(DEFAULT_THEME).toBe("dark");
  });

  it("is SSR-safe: no window/localStorage does not throw and defaults to dark", () => {
    // No storageOverride and (in this Node/vitest test environment) no
    // `window` global - simulates server render.
    expect(() => readTheme()).not.toThrow();
    expect(readTheme()).toBe("dark");
    expect(() => writeTheme("light")).not.toThrow();
  });

  it("persists a written theme so it can be read back", () => {
    const storage = createInMemoryStorage();
    writeTheme("light", storage);
    expect(readTheme(storage)).toBe("light");
  });

  it("rehydrates a previously-persisted theme on a fresh read", () => {
    const storage = createInMemoryStorage();
    writeTheme("dark", storage);
    writeTheme("light", storage);
    // Simulates a page reload: a new read against the same backing store.
    expect(readTheme(storage)).toBe("light");
  });

  it("falls back to the default when the stored value is malformed", () => {
    const storage = createInMemoryStorage();
    storage.setItem("bingogen.theme.v1", "not-a-theme");
    expect(readTheme(storage)).toBe("dark");
  });

  it("toggles dark to light and back", () => {
    expect(toggleTheme("dark")).toBe("light");
    expect(toggleTheme("light")).toBe("dark");
  });

  it("toggle-then-persist round-trips through storage", () => {
    const storage = createInMemoryStorage();
    let theme = readTheme(storage);
    expect(theme).toBe("dark");

    theme = toggleTheme(theme);
    writeTheme(theme, storage);
    expect(readTheme(storage)).toBe("light");

    theme = toggleTheme(theme);
    writeTheme(theme, storage);
    expect(readTheme(storage)).toBe("dark");
  });
});
