import type { ContentDb } from "../engine/types";
import type { CardDef } from "./schema";

/** the keywords the engine acts on by themselves (CardDef.keywords) */
const KEYWORD = /^(hunter|retaliate|aloof|alert|massive|surge|peril|fast|exceptional)(\s*\(\d+\))?$/i;

/** the kinds of printed line the engine runs from a card's data, and the field that must be set for the line to be accounted for (ADR-0013) */
const LINE_RULES: [RegExp, (c: CardDef) => boolean][] = [
  [/^Spawn - /, () => true],
  [/^Prey - /, (c) => !!c.prey],
  [/investigated using \[\w+\] instead/i, (c) => !!c.investigateSkill],
  [/^Uses \(/, (c) => !!c.uses],
  [/^Max \d+ committed per skill test/i, (c) => c.maxCommitted !== undefined],
];

const keywordsOnly = (line: string) => line.split(".").map((p) => p.trim()).filter(Boolean).every((p) => KEYWORD.test(p));

const DIFFICULTIES = { front: ["easy", "standard"], back: ["hard", "expert"] } as const;
const SYMBOLS: Record<string, string> = { skull: "skull", cultist: "cultist", tablet: "tablet", elder_thing: "elderThing" };

/** what a printed token line needs from the scenario's token entry, read off its sentences */
function tokenNeeds(rest: string): ("x" | "onFail" | "revealAnother" | "effect")[] {
  const needs = new Set<"x" | "onFail" | "revealAnother" | "effect">();
  for (const sentence of rest.split(/\.\s+|\.$/).map((p) => p.trim()).filter(Boolean)) {
    if (/^[-+]?\d+$/.test(sentence)) continue; // the modifier
    if (/^-X$/.test(sentence)) needs.add("x");
    else if (/^X is /.test(sentence)) continue;
    else if (/^If you fail/i.test(sentence)) needs.add("onFail");
    else if (/reveal another token/i.test(sentence)) needs.add("revealAnother");
    else needs.add("effect");
  }
  return [...needs];
}

/**
 * A scenario's reference card works when every symbol token line on its front (Easy, Standard) and back (Hard, Expert) is
 * covered by that difficulty's token entry, and all four difficulties are written (ADR-0013).
 */
function referenceCardWorks(db: ContentDb, c: CardDef): boolean {
  const scenario = Object.values(db.scenarios).find((s) => s.card === c.code);
  if (!scenario) return false;
  if (!(["easy", "standard", "hard", "expert"] as const).every((d) => Object.keys(scenario.tokens[d] ?? {}).length)) return false;
  for (const side of ["front", "back"] as const) {
    const text = side === "front" ? c.text : c.backText ?? "";
    for (const line of text.replace(/<br\s*\/?>/g, "\n").replace(/<[^>]+>/g, "").split("\n")) {
      const m = line.trim().match(/^\[(skull|cultist|tablet|elder_thing)\]\s*:?\s*(.*)$/);
      if (!m) continue;
      for (const d of DIFFICULTIES[side]) {
        const e = scenario.tokens[d]?.[SYMBOLS[m[1]] as "skull"];
        if (!e) return false;
        for (const need of tokenNeeds(m[2])) {
          const ok = need === "x" ? e.x !== undefined : need === "onFail" ? !!e.onFail?.length : need === "revealAnother" ? !!e.revealAnother : !!(e.onReveal?.length || e.condition);
          if (!ok) return false;
        }
      }
    }
  }
  return true;
}

/**
 * Whether a card works in the game: its behaviour is written (abilities or a script), or every line of its text is
 * accounted for: a keyword line, or a line of a kind the engine runs from the card's data when that data is set.
 */
export function implemented(db: ContentDb, code: string): boolean {
  const c = db.cards[code];
  if (!c) return false;
  if (c.type === "scenario") return referenceCardWorks(db, c);
  if (c.abilities.length || db.scripts[code]) return true;
  const lines = c.text.replace(/<[^>]+>/g, "").split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.every((l) => keywordsOnly(l) || LINE_RULES.some(([re, set]) => re.test(l) && set(c)));
}
