/**
 * Bingo detection utilities.
 *
 * Each line is an array of 5 cell indices (0-24, row-major order).
 * Lines 0-4: rows, 5-9: columns, 10-11: diagonals.
 */
export const BINGO_LINES: readonly number[][] = [
  // Rows
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8, 9],
  [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24],
  // Columns
  [0, 5, 10, 15, 20],
  [1, 6, 11, 16, 21],
  [2, 7, 12, 17, 22],
  [3, 8, 13, 18, 23],
  [4, 9, 14, 19, 24],
  // Diagonals
  [0, 6, 12, 18, 24],
  [4, 8, 12, 16, 20],
] as const;

/**
 * Returns indices of completed bingo lines (0-11).
 * @param completed 25-element boolean array (index 12 always true for free space)
 */
export function detectBingos(completed: boolean[]): number[] {
  return BINGO_LINES.reduce<number[]>((acc, line, i) => {
    if (line.every((idx) => completed[idx])) {
      acc.push(i);
    }
    return acc;
  }, []);
}

/**
 * Returns only the bingo lines that are new since the previous check.
 * Used to trigger celebration animation only for freshly completed lines.
 */
export function findNewBingos(current: number[], previous: number[]): number[] {
  const prevSet = new Set(previous);
  return current.filter((b) => !prevSet.has(b));
}
