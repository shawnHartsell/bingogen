import { describe, expect, it } from "vitest";
import { createInMemoryStorage } from "@/lib/cardRepository";
import { readTheme, toggleThemeValue, writeTheme } from "@/lib/theme";

describe("theme persistence", () => {
  it("defaults to dark when nothing has been saved", () => {
    const storage = createInMemoryStorage();
    expect(readTheme(storage)).toBe("dark");
  });

  it("defaults to dark when storage is unavailable (SSR)", () => {
    expect(readTheme(null)).toBe("dark");
  });

  it("defaults to dark when the stored value is invalid/corrupted", () => {
    const storage = createInMemoryStorage();
    storage.setItem("bingogen.theme.v1", "not-a-theme");
    expect(readTheme(storage)).toBe("dark");
  });

  it("persists and rehydrates a saved light preference", () => {
    const storage = createInMemoryStorage();
    writeTheme(storage, "light");
    expect(readTheme(storage)).toBe("light");
  });

  it("persists and rehydrates a saved dark preference", () => {
    const storage = createInMemoryStorage();
    writeTheme(storage, "dark");
    expect(readTheme(storage)).toBe("dark");
  });

  it("writing is a no-op when storage is unavailable (SSR), never throws", () => {
    expect(() => writeTheme(null, "light")).not.toThrow();
  });

  it("toggles dark to light and back", () => {
    expect(toggleThemeValue("dark")).toBe("light");
    expect(toggleThemeValue("light")).toBe("dark");
  });

  it("round-trips a full toggle-and-persist cycle", () => {
    const storage = createInMemoryStorage();
    let theme = readTheme(storage);
    expect(theme).toBe("dark");

    theme = toggleThemeValue(theme);
    writeTheme(storage, theme);
    expect(readTheme(storage)).toBe("light");

    theme = toggleThemeValue(theme);
    writeTheme(storage, theme);
    expect(readTheme(storage)).toBe("dark");
  });
});
