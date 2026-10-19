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

/**
 * Whether a card works in the game: its behaviour is written (abilities or a script), or every line of its text is
 * accounted for: a keyword line, or a line of a kind the engine runs from the card's data when that data is set.
 */
export function implemented(db: ContentDb, code: string): boolean {
  const c = db.cards[code];
  if (!c) return false;
  if (c.abilities.length || db.scripts[code]) return true;
  const lines = c.text.replace(/<[^>]+>/g, "").split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.every((l) => keywordsOnly(l) || LINE_RULES.some(([re, set]) => re.test(l) && set(c)));
}
