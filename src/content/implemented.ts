import type { ContentDb } from "../engine/world/types";
import { keywordName, TokenEffect, type CardDef, type Spawn } from "./schema";
import { hasScript } from "../engine/world/scripts";

/** the keywords the engine acts on by themselves (CardDef.keywords) */
const KEYWORD =
  /^(hunter|retaliate|aloof|alert|massive|surge|peril|fast|exceptional|doomed|elusive|vehicle|hidden|relentless|veiled|exile|predator)(\s*\(\d+\))?$/i;

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
    spawn === "Engaged with Prey" ||
    spawn === "toYourRight"
  )
    return true;
  return Object.values(db.cards).some((c) => c.type === "location" && c.name === spawn);
}

/** the kinds of printed line the engine runs from a card's data, and the field that must be set for the line to be accounted for (ADR-0013) */
const LINE_RULES: [RegExp, (c: CardDef, db: ContentDb) => boolean][] = [
  [/^Spawn - /, (c, db) => spawnResolves(db, c.spawn)],
  [/^Prey - /, (c) => !!c.prey],
  [/ enters play exhausted\.$/, (c) => !!c.entersExhausted],
  [
    /would defeat an investigator, that investigator is instead killed\.$/,
    (c) => !!c.killsOnDefeat,
  ],
  [/investigated using \[\w+\] instead/i, (c) => !!c.investigateSkill],
  [/^Uses \(/, (c) => !!c.uses],
  // an unrevealed location's entry: a clue the entering investigator spends, or a lock (rules/investigators.ts)
  [/^As an additional cost to enter .+, you must spend \d+ clues?\.$/, (c) => !!c.enterClues],
  [/ is locked\. You cannot enter the .+\.$/, (c) => !!c.cannotEnterUnrevealed],
  // an enemy damaged only by some sources (rules/enemies.ts)
  [/^Cannot be damaged except by .+\.$/, (c) => !!c.damageOnlyFrom],
  [/^Max \d+ committed per skill test/i, (c) => c.maxCommitted !== undefined],
  [/^As an additional cost to commit .*, take \d+ horror/i, (c) => !!c.commitHorror],
  [/^You may commit .* after revealing chaos tokens/i, (c) => !!c.commitAfterReveal],
  // a cost paid as it is committed, and what it gives (engine/rules/skillTest.ts): Torrent of Power
  [
    /^As an additional cost to commit .+, spend up to \d+ (resources|charges)/,
    (c) => !!c.commitSpend,
  ],
  [/^For each charge spent in this way, .+ gains /, (c) => !!c.commitSpend?.icons],
  // a token from the card, not the bag (engine/rules/skillTest.ts): Seal of the Elder Sign
  [/^Do not reveal chaos tokens from the chaos bag for this test\./, (c) => !!c.sealsToken],
  [/^When this test ends, remove .+ from the game\.$/, (c) => !!c.sealsToken],
  // read as the scenario ends (engine/campaign/campaign.ts): Charon's Obol
  [/^When earning experience during the resolution of a scenario/, (c) => !!c.scenarioEnd],
  // commit restrictions, read by canCommit (engine/rules/skillTest.ts)
  [/^Commit only to a skill test you are performing\.$/, (c) => !!c.commitOnlyOwnTest],
  [
    /^Commit only to a skill test you are performing, and only if the difficulty of that test is at least \d+ higher than your base skill value\.$/,
    (c) => !!c.commitOnlyOwnTest && c.commitDifficultyOverBase !== undefined,
  ],
  [/^Commit to a skill test only if /, (c) => !!c.commitIf],
  // an asset that soaks damage dealt at its location (engine/rules/investigators.ts): True Grit
  [
    /^.+ may be assigned damage dealt to other investigators at your location\.$/,
    (c) => !!c.soaksForLocation,
  ],
  // icons on another investigator's test, read by iconsFor (engine/rules/skillTest.ts)
  [
    /^While .+ is committed to a skill test being performed by another investigator, .+ gains /,
    (c) => !!c.iconsOnOthersTest,
  ],
  // deckbuilding lines, read by the deck validator (engine/decks.ts) and the setup (a permanent card starts in play)
  [
    /^((Permanent|Exceptional|Reward|Limit \d+ per deck|Purchase only at deck creation)\.\s*)+$/,
    () => true,
  ],
  [/^You get \+\d+ deck size\.$/, () => true],
  // Adaptable's swaps between scenarios, read by the upgrade (engine/campaign/upgrade.ts)
  [
    /^In between each game of a campaign, you may swap up to two level 0 cards out of your deck/,
    () => true,
  ],
  [
    /^Your investigator's Deckbuilding Options gains: "one other \[\[\w+\]\] or \[\[\w+\]\] asset/,
    () => true,
  ],
];

/** a keyword with an argument, accounted for when the card's keywords hold it as data */
const ARGUED: [RegExp, string][] = [
  [/^Patrol \(/i, "patrol"],
  [/^Swarming \d+$/i, "swarming"],
  [/^Swarming X$/i, "swarming"],
  [/^Bonded \(/i, "bonded"],
  [/^Predator \(/i, "predator"],
  [/^Researched$/i, "researched"],
];
const holds = (c: CardDef, name: string) =>
  (c.keywords ?? []).some((k) => typeof k === "object" && keywordName(k) === name);

/** a line of keywords, with a "Prey (…)" among them when the card's prey is set */
const keywordsOnly = (line: string, c: CardDef) =>
  line
    .split(/\.(?![^(]*\))/)
    .map((p) => p.trim())
    .filter(Boolean)
    .every(
      (p) =>
        KEYWORD.test(p) ||
        (p.startsWith("Prey (") && !!c.prey) ||
        ARGUED.some(([re, name]) => re.test(p) && holds(c, name)),
    );

const DIFFICULTIES = { front: ["easy", "standard"], back: ["hard", "expert"] } as const;
const SYMBOLS: Record<string, string> = {
  skull: "skull",
  cultist: "cultist",
  tablet: "tablet",
  elder_thing: "elderThing",
};

/** what a printed token line needs from the scenario's token entry, read off its sentences */
type TokenNeed =
  | "x"
  | "xMax"
  | "instead"
  | "onFail"
  | "onSuccess"
  | "payToZero"
  | "either"
  | "revealAnother"
  | "effect";
function tokenNeeds(rest: string): TokenNeed[] {
  const needs = new Set<TokenNeed>();
  let failing = false; // the sentences after "If you fail, …" that don't start a new condition go on being the failure effect
  for (const sentence of rest
    .split(/\.\s+|\.$/)
    .map((p) => p.trim())
    .filter(Boolean)) {
    if (/^[-+]?\d+$/.test(sentence)) continue; // the modifier
    // "-X", "-X, where X is …", "-2 for each …"; "(If you have no horror on you, X is 1.)" bounds that X
    if (/^-X(,|$)/.test(sentence) || /^-\d+ for each/.test(sentence)) needs.add("x");
    else if (/^\(If .*, X is \d+\.?\)$/.test(sentence)) needs.add("x");
    // "-2 (-4 instead if …)", "-3 instead if …": the other modifier under a condition
    else if (/^-\d+ \(-\d+ instead/.test(sentence) || /^-\d+ instead if/.test(sentence))
      needs.add("instead");
    // "X is the amount of doom in play (max 5)": the cap is the entry's
    else if (sentence.startsWith("X is ") && /\(max \d+\)$/.test(sentence)) needs.add("xMax");
    else if (sentence.startsWith("X is ")) continue;
    else if (/^You may spend \d+ resources to treat this token as a 0/i.test(sentence))
      needs.add("payToZero");
    // "You must either …, or this token's modifier is −4 instead / this test automatically fails"
    else if (/^(You must e|E)ither /.test(sentence)) needs.add("either");
    else if (/^If you succeed/i.test(sentence)) {
      needs.add("onSuccess");
      failing = false;
    } else if (/^If you fail/i.test(sentence)) {
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

/** the X values the engine computes (`tokenX` in engine/rules/tokens.ts handles every one of them) */
const ENGINE_X: readonly string[] = TokenEffect.shape.x.unwrap().options;
/** a token entry's X is one the engine computes; a line the printed card makes conditional needs one */
const engineX = (x: unknown) => typeof x === "string" && ENGINE_X.includes(x);

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
              ? engineX(e.x)
              : need === "xMax"
                ? e.xMax !== undefined
                : need === "instead"
                  ? e.instead !== undefined || engineX(e.x)
                  : need === "onFail"
                    ? !!e.onFail?.length || !!e.afterTest?.ifFailed
                    : need === "onSuccess"
                      ? !!e.onSuccess?.length
                      : need === "payToZero"
                        ? !!e.payToZero
                        : need === "either"
                          ? !!e.either
                          : need === "revealAnother"
                            ? !!e.revealAnother
                            : !!(
                                e.onReveal?.length ||
                                e.condition ||
                                e.cancelCommitted ||
                                // "After this skill test, …"
                                e.afterTest ||
                                // "If it is Agenda 2, you automatically fail instead"
                                e.instead?.autoFail
                              );
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
