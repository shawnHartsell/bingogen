// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useTheme, THEME_STORAGE_KEY } from "@/hooks/useTheme";

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.classList.remove("dark");
});

describe("useTheme", () => {
  it("defaults to dark when localStorage has no stored preference", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");
  });

  it("rehydrates a stored 'light' preference from localStorage", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "light");
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("light");
  });

  it("rehydrates a stored 'dark' preference from localStorage", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");
  });

  it("ignores an invalid stored value and falls back to dark", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "purple");
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");
  });

  it("falls back to dark when localStorage access throws (e.g. private mode)", () => {
    const getItemSpy = vi
      .spyOn(window.localStorage.__proto__, "getItem")
      .mockImplementation(() => {
        throw new DOMException("blocked", "SecurityError");
      });

    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");

    getItemSpy.mockRestore();
  });

  it("toggles the theme between dark and light", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");

    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe("light");

    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe("dark");
  });

  it("persists the toggled theme to localStorage", () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.toggleTheme();
    });

    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");

    act(() => {
      result.current.toggleTheme();
    });

    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("persists across a fresh hook instance simulating a page reload", () => {
    const first = renderHook(() => useTheme());
    act(() => {
      first.result.current.toggleTheme();
    });
    expect(first.result.current.theme).toBe("light");

    const second = renderHook(() => useTheme());
    expect(second.result.current.theme).toBe("light");
  });

  it("setTheme allows setting an explicit value", () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme("light");
    });
    expect(result.current.theme).toBe("light");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");

    act(() => {
      result.current.setTheme("dark");
    });
    expect(result.current.theme).toBe("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });
});
