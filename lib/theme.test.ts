import { describe, expect, it, vi } from "vitest";
import { createInMemoryStorage } from "@/lib/cardRepository";
import {
  createThemeController,
  DEFAULT_THEME,
  readTheme,
  THEME_KEY,
  writeTheme,
} from "@/lib/theme";

describe("theme controller", () => {
  it("defaults to dark when nothing has been saved", () => {
    const controller = createThemeController(createInMemoryStorage());
    expect(controller.getTheme()).toBe("dark");
    expect(DEFAULT_THEME).toBe("dark");
  });

  it("defaults to dark when storage is unavailable (SSR)", () => {
    // No storageOverride and no `window` global in this test environment.
    const controller = createThemeController();
    expect(controller.getTheme()).toBe("dark");
  });

  it("toggles between dark and light", () => {
    const controller = createThemeController(createInMemoryStorage());
    expect(controller.getTheme()).toBe("dark");

    controller.toggle();
    expect(controller.getTheme()).toBe("light");

    controller.toggle();
    expect(controller.getTheme()).toBe("dark");
  });

  it("setTheme sets an explicit value and is idempotent for the same value", () => {
    const storage = createInMemoryStorage();
    const controller = createThemeController(storage);
    const listener = vi.fn();
    controller.subscribe(listener);

    controller.setTheme("light");
    expect(controller.getTheme()).toBe("light");
    expect(listener).toHaveBeenCalledTimes(1);

    // Setting the same value again should not notify subscribers.
    controller.setTheme("light");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("persists the theme across controller instances (rehydration)", () => {
    const storage = createInMemoryStorage();
    const first = createThemeController(storage);
    first.toggle(); // dark -> light
    expect(first.getTheme()).toBe("light");

    const second = createThemeController(storage);
    expect(second.getTheme()).toBe("light");
  });

  it("notifies subscribers on toggle and stops notifying after unsubscribe", () => {
    const controller = createThemeController(createInMemoryStorage());
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);

    controller.toggle();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    controller.toggle();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("readTheme falls back to dark for malformed/unknown stored values", () => {
    const storage = createInMemoryStorage();
    storage.setItem(THEME_KEY, "not-a-theme");
    expect(readTheme(storage)).toBe("dark");

    expect(readTheme(null)).toBe("dark");
  });

  it("writeTheme persists a valid value and is a safe no-op with no storage", () => {
    const storage = createInMemoryStorage();
    writeTheme(storage, "light");
    expect(storage.getItem(THEME_KEY)).toBe("light");

    expect(() => writeTheme(null, "dark")).not.toThrow();
  });

  it("writeTheme swallows storage write failures instead of throwing", () => {
    const failingStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota exceeded");
      },
      removeItem: () => {},
    };
    expect(() => writeTheme(failingStorage, "light")).not.toThrow();
  });
});
