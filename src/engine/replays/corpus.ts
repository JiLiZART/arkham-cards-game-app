/** where the replay corpus lives, and how recordings get the content they were made with */
import type { ContentDb } from "../world/types";
import { SCRIPT_MEMBERS, scriptCodes, scriptOf } from "../world/scripts";

export const CORPUS = "src/engine/replays/corpus";

/**
 * Make the loaded packs exactly core plus `packs`. Packs can't be unloaded, and loaded cards change a game (a campaign's
 * random basic weakness is drawn from every loaded card), so a pack outside the list already loaded is refused.
 */
export async function usePacks(
  db: ContentDb,
  packs: string[],
  load: (pack: string) => Promise<unknown>,
): Promise<void> {
  const allowed = new Set(["core", ...packs]);
  const extra = Object.entries(db.packs)
    .filter(([p, x]) => x.loaded && !allowed.has(p))
    .map(([p]) => p);
  if (extra.length)
    throw new Error(`packs ${extra.join(", ")} are loaded but not named by this recording`);
  for (const p of packs) if (!db.packs[p]?.loaded) await load(p);
}

/** recordings that need fewer packs first, so packs only ever get added along the way (stable otherwise) */
export const inPackOrder = <T extends { packs: string[] }>(xs: T[]): T[] =>
  xs
    .map((x, i) => ({ x, i }))
    .sort((a, b) => a.x.packs.length - b.x.packs.length || a.i - b.i)
    .map(({ x }) => x);

const traced = new WeakSet<object>();

/**
 * Wrap every function of every loaded script so a call adds the script's code to `ran` (each script once; call again
 * after loading a pack). The replay test uses it to list the scripts no recording runs. It changes nothing a script does.
 */
export function traceScripts(db: ContentDb, ran: Set<string>): void {
  for (const code of scriptCodes(db)) {
    const script = scriptOf(db, code)!;
    if (traced.has(script)) continue;
    traced.add(script);
    const wrap = <F>(f: F): F =>
      (typeof f !== "function"
        ? f
        : function (this: unknown, ...args: unknown[]) {
            ran.add(code);
            return (f as (...a: unknown[]) => unknown).apply(this, args);
          }) as F;
    const s = script as unknown as Record<string, unknown>;
    // every member: a function is wrapped, a map of functions (fns, conditions, hooks) has each entry wrapped
    for (const k of SCRIPT_MEMBERS) {
      const v = s[k];
      if (typeof v === "function") s[k] = wrap(v);
      else if (v && typeof v === "object" && !Array.isArray(v)) {
        const m = v as Record<string, unknown>;
        for (const name of Object.keys(m)) m[name] = wrap(m[name]);
      }
    }
  }
}
