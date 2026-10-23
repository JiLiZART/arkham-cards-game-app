/** a simple scripted player used by playthrough tests and the debug "auto-play" button */
import { dispatch, type Result } from "./engine";
import { locations, stepsToward } from "./core";
import type { ContentDb } from "./types";

const PREFS: RegExp[] = [
  /^Advance act/,
  /Spend .* clues and advance/,
  /^Spend 2 clues per investigator/,
  /^Throw Lita/,
  /Lita Chantler: parley/,
  /^Commit/,
  /^Fight/,
  /fight/i,
  /^Play (?!Dynamite)/,
  /^Investigate/,
  /investigate/i,
  /^Move to (?!Study)/,
  /^Done/,
  /^Keep hand/,
  /^Gain 1 resource/,
  /^End turn/,
];

/** next step toward the nearest location that is unrevealed or has clues */
function goal(db: ContentDb, r: Result, i: string): string | undefined {
  const s = r.state;
  const g = { s, db, events: [] };
  const here = s.invs[i].location;
  if (!here) return undefined;
  const wanted = locations(g)
    .filter((l) => l.id !== here && (!l.revealed || l.clues > 0))
    .map((l) => l.id);
  const targets = wanted.length
    ? wanted
    : locations(g)
        .filter((l) => l.id !== here)
        .map((l) => l.id);
  return stepsToward(g, here, targets)[0];
}
export function botChoice(db: ContentDb, r: Result): string {
  const p = r.state.pending!;
  if (p.promptKey === "playerWindow") return p.options.find((o) => o.id === "act")?.id ?? "pass"; // the bot plays no cards out of turn, but advances the act
  if (p.kind === "reaction") return p.options.find((o) => o.id !== "pass")?.id ?? "pass";
  if (p.kind === "turn") {
    // move toward unexplored locations when there's nothing to investigate here
    const here = r.state.invs[p.inv].location;
    const clues = here ? r.state.cards[here].clues : 0;
    for (const re of PREFS) {
      const o = p.options.find((x) => {
        if (!re.test(x.label)) return false;
        if (/investigate/i.test(x.label) && clues === 0) return false;
        if (/^Move/.test(x.label))
          return clues === 0 && (x.value as { to?: string }).to === goal(db, r, p.inv);
        return true;
      });
      if (o) return o.id;
    }
  }
  if (p.kind === "commit") return p.options.find((o) => /^Commit/.test(o.label))?.id ?? "done";
  if (p.kind === "assign") return p.options.at(-1)!.id; // soak with assets first
  return p.options[0].id;
}

export function autoPlay(db: ContentDb, r: Result, maxSteps = 4000): Result {
  for (let k = 0; k < maxSteps && r.state.pending; k++) {
    const p = r.state.pending;
    const next = dispatch(db, r.state, { type: "choose", inv: p.inv, option: botChoice(db, r) });
    if (next.error) throw new Error(next.error);
    r = next;
  }
  return r;
}
