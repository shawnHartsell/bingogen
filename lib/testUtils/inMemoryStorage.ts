// Simple in-memory implementation of StorageLike for testing the repository
// contract against a mock backing (no real localStorage involved).

import type { StorageLike } from "@/lib/types";

export function createInMemoryStorage(): StorageLike {
  const data = new Map<string, string>();
  return {
    getItem(key) {
      return data.has(key) ? data.get(key)! : null;
    },
    setItem(key, value) {
      data.set(key, value);
    },
    removeItem(key) {
      data.delete(key);
    },
  };
}
