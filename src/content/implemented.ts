import type { ContentDb } from "../engine/world/types";
import type { CardDef, Spawn } from "./schema";
import { hasScript } from "../engine/world/scripts";

/** the keywords the engine acts on by themselves (CardDef.keywords) */
const KEYWORD =
  /^(hunter|retaliate|aloof|alert|massive|surge|peril|fast|exceptional|doomed|elusive|vehicle)(\s*\(\d+\))?$/i;

/** the spawn values the engine resolves (rules/enemies.ts): the two keywords, or the name of a location in the content */
function spawnResolves(db: ContentDb, spawn: Spawn | undefined): boolean {
  if (!spawn) return false;
  // an expression resolves when every location it names by name is in the content
  if (typeof spawn === "object")
    return [spawn, ...(spawn.or ?? [])].every((x) =>
      typeof x === "string"
        ? spawnResolves(db, x)
        : !x.name ||
          Object.values(db.cards).some((c) => c.type === "location" && c.name === x.name),
    );
  if (
    spawn === "emptyLocation" ||
    spawn === "farthestEmptyLocation" ||
    spawn === "Engaged with Prey"
  )
    return true;
  return Object.values(db.cards).some((c) => c.type === "location" && c.name === spawn);
}

/** the kinds of printed line the engine runs from a card's data, and the field that must be set for the line to be accounted for (ADR-0013) */
const LINE_RULES: [RegExp, (c: CardDef, db: ContentDb) => boolean][] = [
  [/^Spawn - /, (c, db) => spawnResolves(db, c.spawn)],
  [/^Prey - /, (c) => !!c.prey],
  [/investigated using \[\w+\] instead/i, (c) => !!c.investigateSkill],
  [/^Uses \(/, (c) => !!c.uses],
  [/^Max \d+ committed per skill test/i, (c) => c.maxCommitted !== undefined],
  [/^As an additional cost to commit .*, take \d+ horror/i, (c) => !!c.commitHorror],
  [/^You may commit .* after revealing chaos tokens/i, (c) => !!c.commitAfterReveal],
  // deckbuilding lines, read by the deck validator (engine/decks.ts) and the setup (a permanent card starts in play)
  [/^((Permanent|Reward|Limit \d+ per deck|Purchase only at deck creation)\.\s*)+$/, () => true],
  [/^You get \+\d+ deck size\.$/, () => true],
  [
    /^Your investigator's Deckbuilding Options gains: "one other \[\[\w+\]\] or \[\[\w+\]\] asset/,
    () => true,
  ],
];

/** a line of keywords, with a "Prey (…)" among them when the card's prey is set */
const keywordsOnly = (line: string, c: CardDef) =>
  line
    .split(".")
    .map((p) => p.trim())
    .filter(Boolean)
    .every((p) => KEYWORD.test(p) || (p.startsWith("Prey (") && !!c.prey));

const DIFFICULTIES = { front: ["easy", "standard"], back: ["hard", "expert"] } as const;
const SYMBOLS: Record<string, string> = {
  skull: "skull",
  cultist: "cultist",
  tablet: "tablet",
  elder_thing: "elderThing",
};

/** what a printed token line needs from the scenario's token entry, read off its sentences */
type TokenNeed = "x" | "instead" | "onFail" | "revealAnother" | "effect";
function tokenNeeds(rest: string): TokenNeed[] {
  const needs = new Set<TokenNeed>();
  let failing = false; // the sentences after "If you fail, …" that don't start a new condition go on being the failure effect
  for (const sentence of rest
    .split(/\.\s+|\.$/)
    .map((p) => p.trim())
    .filter(Boolean)) {
    if (/^[-+]?\d+$/.test(sentence)) continue; // the modifier
    if (/^-X$/.test(sentence) || /^-\d+ for each/.test(sentence)) needs.add("x");
    // "-2 (-4 instead if …)", "-3 instead if …": the other modifier under a condition
    else if (/^-\d+ \(-\d+ instead/.test(sentence) || /^-\d+ instead if/.test(sentence))
      needs.add("instead");
    else if (sentence.startsWith("X is ")) continue;
    else if (/^If you fail/i.test(sentence)) {
      needs.add("onFail");
      failing = true;
    } else if (
      failing &&
      !/^(If |Reveal )/.test(sentence) &&
      !/reveal another token/i.test(sentence)
    )
      continue;
    else if (/reveal another token/i.test(sentence)) needs.add("revealAnother");
    else needs.add("effect");
  }
  return [...needs];
}

/**
 * A scenario's token effects are real when every symbol token line on its reference card's front (Easy, Standard) and back
 * (Hard, Expert) is covered by that difficulty's token entry, and all four difficulties are written (ADR-0013).
 */
export function tokensReal(db: ContentDb, scenarioId: string): boolean {
  const scenario = db.scenarios[scenarioId];
  const c = scenario && db.cards[scenario.card];
  if (!c) return false;
  if (
    !(["easy", "standard", "hard", "expert"] as const).every(
      (d) => Object.keys(scenario.tokens[d] ?? {}).length,
    )
  )
    return false;
  for (const side of ["front", "back"] as const) {
    const text = side === "front" ? c.text : (c.backText ?? "");
    for (const line of text
      .replace(/<br\s*\/?>/g, "\n")
      .replace(/<[^>]+>/g, "")
      .split("\n")) {
      const m = line.trim().match(/^\[(skull|cultist|tablet|elder_thing)\]\s*:?\s*(.*)$/);
      if (!m) continue;
      for (const d of DIFFICULTIES[side]) {
        const e = scenario.tokens[d]?.[SYMBOLS[m[1]] as "skull"];
        if (!e) return false;
        for (const need of tokenNeeds(m[2])) {
          const ok =
            need === "x"
              ? e.x !== undefined
              : need === "instead"
                ? e.instead !== undefined || e.x !== undefined
                : need === "onFail"
                  ? !!e.onFail?.length
                  : need === "revealAnother"
                    ? !!e.revealAnother
                    : !!(e.onReveal?.length || e.condition);
          if (!ok) return false;
        }
      }
    }
  }
  return true;
}

/**
 * A reference card works when it is real for every scenario that plays with it (a Return-to scenario plays with its base
 * scenario's card); a Return-to box's setup card, played beside it, works when it prints no symbol token line.
 */
function referenceCardWorks(db: ContentDb, c: CardDef): boolean {
  const users = Object.values(db.scenarios).filter((s) => s.card === c.code);
  if (users.length) return users.every((s) => tokensReal(db, s.id));
  const setup = Object.values(db.scenarios).some((s) => s.setupCards?.includes(c.code));
  return setup && !/\[(skull|cultist|tablet|elder_thing)\]/.test(`${c.text}\n${c.backText ?? ""}`);
}

/**
 * Whether a card works in the game: its behaviour is written (abilities or a script), or every line of its text is
 * accounted for: a keyword line, or a line of a kind the engine runs from the card's data when that data is set.
 */
export function implemented(db: ContentDb, code: string): boolean {
  const c = db.cards[code];
  if (!c) return false;
  if (c.type === "scenario") return referenceCardWorks(db, c);
  if (c.abilities.length || hasScript(db, code)) return true;
  // both sides are printed text; a line break is printed as <br/> as often as a newline
  const lines = `${c.text}\n${c.backText ?? ""}`
    .replace(/<br\s*\/?>/g, "\n")
    // italic reminder text in parentheses explains a keyword: not a line of its own
    .replace(/<i>\([^<]*\)<\/i>/g, "")
    .replace(/<[^>]+>/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.every(
    (l) => keywordsOnly(l, c) || LINE_RULES.some(([re, set]) => re.test(l) && set(c, db)),
  );
}
