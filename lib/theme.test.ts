import { describe, expect, it } from "vitest";
import {
  readStoredTheme,
  writeStoredTheme,
  THEME_STORAGE_KEY,
  type StorageLike,
} from "@/lib/theme";

function createInMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

describe("readStoredTheme", () => {
  it("defaults to dark when nothing is stored", () => {
    const storage = createInMemoryStorage();
    expect(readStoredTheme(storage)).toBe("dark");
  });

  it("defaults to dark when storage is unavailable (e.g. SSR)", () => {
    expect(readStoredTheme(null)).toBe("dark");
  });

  it("returns the stored theme when valid", () => {
    const storage = createInMemoryStorage();
    storage.setItem(THEME_STORAGE_KEY, "light");
    expect(readStoredTheme(storage)).toBe("light");
  });

  it("falls back to dark for a malformed stored value", () => {
    const storage = createInMemoryStorage();
    storage.setItem(THEME_STORAGE_KEY, "not-a-theme");
    expect(readStoredTheme(storage)).toBe("dark");
  });
});

describe("writeStoredTheme", () => {
  it("persists the theme so it can be read back", () => {
    const storage = createInMemoryStorage();
    writeStoredTheme(storage, "light");
    expect(readStoredTheme(storage)).toBe("light");
  });

  it("is a no-op when storage is unavailable", () => {
    expect(() => writeStoredTheme(null, "light")).not.toThrow();
  });

  it("does not throw when the underlying storage write fails", () => {
    const failingStorage: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota exceeded");
      },
    };
    expect(() => writeStoredTheme(failingStorage, "light")).not.toThrow();
  });
});
