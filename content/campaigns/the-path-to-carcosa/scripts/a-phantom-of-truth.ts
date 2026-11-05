// A Phantom of Truth: three nights in Paris. Act 1 and act 2 are version I when the investigators have as much Doubt as
// Conviction, else version II (the deck's `when`, with the encounter cards each version leaves out); Jordan Perry
// waits set aside unless slain, and if he was interviewed the investigators begin at Montparnasse with 3 more
// resources. While Conviction leads, the agendas count the doom on other cards against their own. The Organist, a
// double-sided enemy that can't be damaged, spawns from act 1's back on the side its version names. As it ends the
// campaign log learns whether Jordan Perry is in the victory display.
import {
  activeInvs,
  addCounter,
  allCards,
  campaignLogOf,
  canEnemyEnter,
  card,
  cardIf,
  type CardScript,
  connections,
  createCard,
  currentAct,
  def,
  distances,
  emit,
  enemies,
  flags,
  type GameContext,
  inv,
  invsAt,
  playerCount,
  type ScriptRun,
  setCardLocation,
  setEngaged,
  turnOrder,
  EVENT,
  ZONE,
  queue,
  advanceAct,
  endScenario,
} from "../../../../src/engine/api";
import { gardensFor } from "../../../packs/ptc/scripts/03220";

export const ORGANIST = "03221";
/** The Organist's other face: Draped in Mystery (aloof) */
export const DRAPED = "03221b";
export const JORDAN = "03066b";
/** Jordan Perry's Bystander: "listed under VIPs Interviewed" */
export const JORDAN_INTERVIEWED = "03077";
export const MONTPARNASSE = "03208";
export const PURSUING_SHADOWS = "03206";

/** "If you have more Conviction than Doubt" */
export const convictionLeads = (game: GameContext) => {
  const log = campaignLogOf(game);
  const n = (k: string) => (typeof log[k] === "number" ? (log[k] as number) : 0);
  return n("conviction") > n("doubt");
};
/** "doom in play" */
export { doomInPlay } from "../../../packs/ptc/scripts/03092";
/** The Organist in play, either face */
export const organist = (game: GameContext) =>
  enemies(game).find((e) => e.code === ORGANIST || e.code === DRAPED);

/** act 2's backs and agenda 3b's: "If you intruded on a secret meeting, (→R2). Otherwise, (→R1)." */
export const lostLamb = (game: GameContext) =>
  queue(game, endScenario({ id: campaignLogOf(game).intrudedOnSecretMeeting ? "R2" : "R1" }));

/**
 * "Move The Organist 1 location away from the nearest investigator (to a location with no investigators, if
 * possible)": a connecting location farther from the nearest investigators than he is, the lead choosing among equals;
 * none: he stays
 */
export function organistAway(game: GameContext, run: ScriptRun) {
  const o = organist(game);
  if (!o?.location) return;
  const here = o.location;
  const spots = activeInvs(game).flatMap((i) => inv(game, i).location ?? []);
  if (!spots.length) return;
  const from = distances(game, here, o.id);
  const near = Math.min(...spots.map((l) => from.get(l) ?? Infinity));
  const nearest = spots.filter((l) => from.get(l) === near);
  const away = connections(game, here, o.id).filter((l) => {
    if (!canEnemyEnter(game, o.id, l)) return false;
    const d = distances(game, l, o.id);
    return Math.min(...nearest.map((n) => d.get(n) ?? Infinity)) > near;
  });
  const empty = away.filter((l) => !invsAt(game, l).length);
  const options = empty.length ? empty : away;
  if (!options.length) return;
  const to = run.chooseCard(
    options,
    { text: "Move The Organist where?", key: "apotOrganistAway" },
    { who: turnOrder(game)[0] },
  );
  setEngaged(game, o.id, null);
  setCardLocation(game, o.id, to);
  emit(game, EVENT.EnemyMove, `The Organist moves to ${def(game, to).name}`, { card: o.id });
}

export default {
  fns: {
    /** "If Jordan Perry is not listed under VIPs Slain": he waits set aside for agenda 2b */
    jordanAside(game: GameContext) {
      createCard(game, JORDAN, ZONE.SetAside);
    },
    /** Jordan's Information: each investigator begins with 3 additional resources */
    jordansInformation(game: GameContext) {
      for (const i of turnOrder(game)) addCounter(game, i, "resources", 3);
    },
  },
  hooks: {
    /** act 2 v.I: "If there are 3 [per_investigator] clues on The Organist, advance." */
    checkObjectives(game: GameContext) {
      const o = organist(game);
      if (
        cardIf(game, currentAct(game))?.code === PURSUING_SHADOWS &&
        o &&
        card(game, o.id).clues >= 3 * playerCount(game)
      )
        queue(game, advanceAct({ by: "objective" }));
    },
    connections: gardensFor,
    ended(game: GameContext) {
      if (allCards(game).some((c) => c.code === JORDAN && c.zone === ZONE.Victory))
        flags.logEntry.set(game, ["vipsSlain", JORDAN], true);
    },
  },
} satisfies CardScript;
