// Where Doom Awaits: the doom of the Brood that escaped and Naomi's clues at setup; the paths' symbol links between
// revealed paths (their unrevealed sides print none); a random set-aside path into play; act 1's clues spent at once and
// act 2's objective (an investigator enters Sentinel Peak); while act 2 is current, clues on [[Altered]] locations only.
import {
  addCounter,
  argField,
  asNumber,
  asStrings,
  campaignLogOf,
  card,
  type CardScript,
  cardsIn,
  currentAct,
  currentAgenda,
  def,
  emit,
  EVENT,
  findByCode,
  type GameContext,
  type InstId,
  inv,
  invsAt,
  leadInvestigator,
  link,
  locations,
  moveCard,
  playerCount,
  queue,
  randomInt,
  type ScriptRun,
  setCounter,
  spawn,
  spendableGroupClues,
  unlink,
  advanceAct,
  ZONE,
} from "../../../../src/engine/api";

export const SCENARIO = "where-doom-awaits";
export const BASE = "02282";
export const ASCENDING = "02283";
export const PEAK = "02284";
export const SETH = "02293";
const ACT_1 = "02277";
const ACT_2 = ["02278", "02279", "02280"];
/**
 * The links the revealed paths print by symbol (the card scans): Slaughtered Woods and Frozen Spring (+) ↔ Eerie Glade
 * (hourglass), Destroyed Path ↔ A Tear in the Path, Dimensional Gap and Lost Memories (T) ↔ Uprooted Woods (moon). Base
 * of the Hill and Ascending Path link to every copy of their paths by their text, in the scenario's `connections`.
 * Return to Where Doom Awaits adds Abandoned Camp (comma) ↔ Fathomless Lake (trefoil), each printing the other.
 */
const SYMBOL_LINKS: [string, string][] = [
  ["02285", "02286"],
  ["02288", "02286"],
  ["02287", "02290"],
  ["02289", "02291"],
  ["02292", "02291"],
  ["51050", "51051"],
];

const inPlay = (game: GameContext, code: string) => findByCode(game, code, [ZONE.Location])?.id;

/** link the revealed paths whose symbols match; a path turned back to its unrevealed side links to none */
export function relink(game: GameContext) {
  for (const [a, b] of SYMBOL_LINKS) {
    const x = inPlay(game, a);
    const y = inPlay(game, b);
    if (!x || !y) continue;
    if (card(game, x).revealed && card(game, y).revealed) link(game, x, y);
    else unlink(game, x, y);
  }
}

/** Ascending the Hill: "Clues cannot be placed on non-[[Altered]] locations", while it is the current act */
export function onlyAltered(game: GameContext, id: InstId) {
  if (currentAct(game) !== id) return [];
  return locations(game)
    .filter((l) => !def(game, l.id).traits.includes("Altered"))
    .map((l) => ({ target: l.id, mod: { flag: "cannotPlaceClues" as const } }));
}

/** a random set-aside path of these codes into play */
export function putPath(game: GameContext, codes: string[]) {
  const pool = cardsIn(game, ZONE.SetAside).filter((c) => codes.includes(c.code));
  if (!pool.length) return;
  const path = pool[randomInt(game, pool.length)].id;
  moveCard(game, path, ZONE.Location);
  emit(game, EVENT.Location, `${def(game, path).name} is put into play`, { card: path });
}

/** What the scenario's cards run by name: given to their card scripts too (a Return-to scenario plays them). */
export const SHARED = {
  fns: {
    wdaRelink(game: GameContext) {
      relink(game);
    },
    /** a random set-aside path of these codes into play (Base of the Hill, Ascending Path) */
    wdaPutPath(game: GameContext, run: ScriptRun) {
      putPath(game, asStrings(argField(run.args, "codes")));
    },
  },
} satisfies CardScript;

export default {
  fns: {
    wdaSetup(game: GameContext) {
      const log = campaignLogOf(game);
      // "Because X brood escaped into the wild, add X doom to agenda 1a"
      const brood = asNumber(log.broodEscaped) ?? 0;
      const agenda = currentAgenda(game);
      if (brood > 0 && agenda) addCounter(game, agenda, "doom", brood);
      // Naomi has your back: the lead gains 1 clue (2 at 3–4 players)
      if (log.naomiHasBack)
        addCounter(game, leadInvestigator(game), "clues", playerCount(game) >= 3 ? 2 : 1);
    },
    ...SHARED.fns,
  },
  hooks: {
    checkObjectives(game: GameContext) {
      const act = currentAct(game);
      const code = act ? card(game, act).code : null;
      // act 1: "When the investigators have collected the requisite number of clues, they must immediately spend them"
      if (
        code === ACT_1 &&
        spendableGroupClues(game) >= (def(game, act!).actClues ?? 0) * playerCount(game)
      )
        queue(game, advanceAct({ spend: true }));
      // act 2: "When an investigator enters Sentinel Peak, advance"
      const peak = inPlay(game, PEAK);
      if (code && ACT_2.includes(code) && peak && invsAt(game, peak).length)
        queue(game, advanceAct());
    },
  },
} satisfies CardScript;

/** the set-aside Seth Bishop, out of play (act 2's backs) */
export const sethAside = (game: GameContext) => findByCode(game, SETH, [ZONE.SetAside])?.id;
/** the set-aside Seth Bishop into play at Sentinel Peak, with `damage` on him (act 2's backs) */
export function sethToPeak(game: GameContext, damage: number) {
  const seth = sethAside(game);
  const peak = inPlay(game, PEAK);
  if (!seth || !peak) return;
  moveCard(game, seth, ZONE.Limbo);
  setCounter(game, seth, "damage", damage);
  queue(game, spawn({ enemy: seth, inv: null, at: peak }));
}
/** whether an investigator stands at a location of this trait */
export const atTrait = (game: GameContext, i: string, trait: string) => {
  const loc = inv(game, i).location;
  return !!loc && def(game, loc).traits.includes(trait);
};
