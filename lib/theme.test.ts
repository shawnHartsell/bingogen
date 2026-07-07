import { describe, expect, it } from "vitest";
import { createInMemoryStorage } from "@/lib/cardRepository";
import {
  applyThemeClass,
  getStoredTheme,
  persistTheme,
  resolveThemeStorage,
} from "@/lib/theme";

// The `useTheme` hook is a thin useState/useEffect wrapper around the
// functions tested here. The Vitest environment in this repo is "node"
// (no jsdom/testing-library), so there is no DOM-rendering harness
// available to call the hook directly; these tests exercise the exact
// logic the hook runs on mount/rehydrate/toggle instead, without
// asserting on DOM classList state directly.

describe("getStoredTheme", () => {
  it("defaults to dark when nothing has been stored", () => {
    const storage = createInMemoryStorage();
    expect(getStoredTheme(storage)).toBe("dark");
  });

  it("defaults to dark when storage is unavailable (e.g. SSR)", () => {
    expect(getStoredTheme(null)).toBe("dark");
  });

  it("returns light when 'light' was persisted", () => {
    const storage = createInMemoryStorage();
    persistTheme(storage, "light");
    expect(getStoredTheme(storage)).toBe("light");
  });

  it("falls back to dark for an unrecognized stored value", () => {
    const storage = createInMemoryStorage();
    storage.setItem("bingogen.theme.v1", "sepia");
    expect(getStoredTheme(storage)).toBe("dark");
  });
});

describe("persistTheme / rehydrate", () => {
  it("round-trips through storage: persist then re-read reflects the new value", () => {
    const storage = createInMemoryStorage();
    expect(getStoredTheme(storage)).toBe("dark");

    persistTheme(storage, "light");
    expect(getStoredTheme(storage)).toBe("light");

    persistTheme(storage, "dark");
    expect(getStoredTheme(storage)).toBe("dark");
  });

  it("is a no-op (never throws) when storage is unavailable", () => {
    expect(() => persistTheme(null, "light")).not.toThrow();
  });

  it("a fresh read against the same storage rehydrates the persisted value", () => {
    // Simulates a page reload: a new "session" reads the same storage.
    const storage = createInMemoryStorage();
    persistTheme(storage, "light");

    const rehydrated = getStoredTheme(storage);
    expect(rehydrated).toBe("light");
  });
});

describe("toggle behavior (as driven by the hook)", () => {
  it("toggling dark -> light -> dark persists each transition", () => {
    const storage = createInMemoryStorage();
    let theme = getStoredTheme(storage);
    expect(theme).toBe("dark");

    theme = theme === "dark" ? "light" : "dark";
    persistTheme(storage, theme);
    expect(getStoredTheme(storage)).toBe("light");

    theme = theme === "dark" ? "light" : "dark";
    persistTheme(storage, theme);
    expect(getStoredTheme(storage)).toBe("dark");
  });
});

describe("resolveThemeStorage", () => {
  it("prefers an explicit override over the browser storage", () => {
    const storage = createInMemoryStorage();
    expect(resolveThemeStorage(storage)).toBe(storage);
  });

  it("falls back to null when no override and no window (SSR)", () => {
    // In the node test environment there is no `window`, mirroring SSR.
    expect(resolveThemeStorage()).toBeNull();
  });
});

describe("applyThemeClass", () => {
  it("does not throw when `document` is unavailable (SSR)", () => {
    expect(() => applyThemeClass("dark")).not.toThrow();
  });
});
