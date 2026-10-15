/** chaos tokens in reference-card order: numbers high to low, then the symbols */
const ORDER = ["+1", "0", "-1", "-2", "-3", "-4", "-5", "-6", "-7", "-8", "skull", "cultist", "tablet", "elderThing", "autoFail", "elderSign", "bless", "curse"];

/** a chaos bag as [token, count] pairs in reference-card order (unknown tokens last) */
export function groupTokens(bag: readonly string[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const t of bag) counts.set(t, (counts.get(t) ?? 0) + 1);
  const rank = (t: string) => (ORDER.includes(t) ? ORDER.indexOf(t) : ORDER.length);
  return [...counts.entries()].sort(([a], [b]) => rank(a) - rank(b));
}
