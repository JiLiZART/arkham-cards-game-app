/** fewest physical tokens for a value, largest first: 9 with [5, 3, 1] → [5, 3, 1] */
export function stackTokens(value: number, denominations: number[]): number[] {
  const out: number[] = [];
  let left = Math.max(0, Math.floor(value));
  for (const d of [...denominations].sort((a, b) => b - a)) {
    while (left >= d) {
      out.push(d);
      left -= d;
    }
  }
  return out;
}
