// Dim Carcosa (its token table's conditions are its reference card's, 03316): the realm of madness. One copy of each
// location with versions is in play, the others set aside; every location enters play revealed, a story card on its
// back. Act 2's version is read from the log (5 or less Conviction and Doubt together: v.I; more Doubt: v.II; more
// Conviction: v.III; tied: the lead chooses on the first turn). Each investigator takes direct horror equal to half
// their sanity. Horror never defeats an investigator here (the sanity rule, through the would-be-defeated hook);
// Possession kills at more than twice their sanity (its own cards). Act 3's [fast] ability flips the investigator's
// location to its story: damage to Hastur, healing, or the location replaced by a set-aside copy. The Hastur
// defeated decides the resolution; the possessed investigators are recorded as the game ends.
import {
  addCounter,
  allCards,
  campaignLogOf,
  card,
  cardIf,
  type CardScript,
  cellOf,
  connections,
  currentAct,
  currentAgenda,
  deckCards,
  def,
  emit,
  enemies,
  enemyStat,
  exhaustEnemy,
  flags,
  type GameContext,
  type InstId,
  inv,
  invIf,
  type InvId,
  leadInvestigator,
  locationByName,
  type Queued,
  maxSanity,
  moveCard,
  placeInvestigator,
  playerCount,
  type ScriptRun,
  setCardLocation,
  setCell,
  setCode,
  setEngaged,
  turnOrder,
  EVENT,
  ZONE,
  queue,
  advanceAct,
  advanceAgenda,
  damageEnemy,
  flip,
  resolveStory,
  revealLocation,
  runScript,
} from "../../../../src/engine/api";
import pallid from "./the-pallid-mask";
import { creatureAttacks } from "../../../packs/ptc/scripts/03335";
import { wingedOneMoves } from "../../../packs/ptc/scripts/03336";
import { palaceSealed } from "../../../packs/ptc/scripts/03331";
import { domainSealed, HASTURS_DOMAIN } from "../../../packs/return/scripts/52060";
import { possessionKills } from "../../../packs/ptc/scripts/03340";

export const MITPM = "03059";
export const PALACE = "03331";
export const BEAST = "03088";
export const PALLID_MASK = "03321b";
export const TATTERED_KING = "03334";
export const KING_IN_YELLOW = "03332";
export const LORD_OF_CARCOSA = "03333";
/** each Hastur, and the resolution his defeat leads to (act 3's back) */
export const HASTURS: Record<string, string> = {
  [TATTERED_KING]: "R1",
  [KING_IN_YELLOW]: "R2",
  [LORD_OF_CARCOSA]: "R3",
};
export const SEARCH_V1 = "03321a";
export const SEARCH_V2 = "03322a";
export const SEARCH_V3 = "03323a";
export const KING_IN_TATTERS = "03324";
export const MADNESS_COILS = "03317";
export const MADNESS_DROWNS = "03318";
export const MADNESS_DIES = "03319";
export const POSSESSION = ["03340", "03341", "03342"];
/** the lead chooses act 2's version on the first turn (Doubt and Conviction tied) */
export const ACT2_CHOICE = "dcaAct2Choice";
/** an investigator "knows the secret" (Hastur's End) */
export const SECRET = "dcaKnowTheSecret";
/** the Hastur that was defeated: `${DEFEATED}:<code>` */
export const DEFEATED = "dcaHasturDefeated";
/**
 * Return to Dim Carcosa: "Hastur's health cannot be reduced to less than 2 [per_investigator] unless any investigator
 * 'knows the secret'" (its setup sets it; damageHastur reads it)
 */
export const HEALTH_FLOOR = "dcaHasturHealthFloor";
/** a location whose story can't be flipped over again */
export const locked = (loc: InstId) => `dcaLocked:${loc}`;
const SCENARIO = "dim-carcosa";

/** the copies of each location with versions: a story that replaces its location takes another set-aside copy */
const SLOTS = [
  ["03326a", "03326c"],
  ["03327a", "03327c", "03327e"],
  ["03328a", "03328c", "03328e"],
  ["03329a", "03329c"],
];

const count = (game: GameContext, k: string) => {
  const v = campaignLogOf(game)[k];
  return typeof v === "number" ? v : 0;
};
/** "If you have more (or equal) Conviction than Doubt" */
export const convictionAtLeastDoubt = (game: GameContext) =>
  count(game, "conviction") >= count(game, "doubt");

/** the Palace of the King in play, by its title: Return to Dim Carcosa's Hastur's Domain (52060) takes its place */
export const palaceInPlay = (game: GameContext) => locationByName(game, "Palace of the King");
/** Hastur in play, whichever version (The King in Yellow at no location) */
export const hastur = (game: GameContext) => enemies(game).find((e) => e.code in HASTURS) ?? null;
export const hasturDamage = (game: GameContext) => hastur(game)?.damage ?? 0;
export const actIs = (game: GameContext, code: string) =>
  cardIf(game, currentAct(game))?.code === code;
export const agendaIs = (game: GameContext, code: string) =>
  cardIf(game, currentAgenda(game))?.code === code;
/** "horror on you greater than twice your sanity" (Dismal Curse, Possession) */
export const overTwiceSanity = (game: GameContext, i: InvId) =>
  inv(game, i).horror > 2 * maxSanity(game, i);

/** a location's story may be flipped: not locked, and the Palace only once Hastur has 5 damage per investigator */
export function canFlip(game: GameContext, loc: InstId | null | undefined): loc is InstId {
  if (!loc || flags.rememberedFact.get(game, locked(loc))) return false;
  if (card(game, loc).code === PALACE && palaceSealed(game)) return false;
  if (card(game, loc).code === HASTURS_DOMAIN && domainSealed(game)) return false;
  return !!def(game, loc).back;
}

/**
 * "Flip your location over and resolve the text on the other side": Creature out of Demhe at it or beside it attacks
 * the investigators there first ("when"), Winged One moves toward it ("after"), then the story resolves.
 */
export function flipLocation(game: GameContext, loc: InstId, you: InvId) {
  const attacks = creatureAttacks(game, loc, [loc, ...connections(game, loc)]);
  wingedOneMoves(game, loc);
  queue(game, ...attacks, flip(loc), resolveStory({ card: loc, you }));
}

/**
 * the steps that deal damage to Hastur from a story card (he takes damage from nothing else; in Return to Dim Carcosa not
 * below 2 health per investigator without the secret), then check the agendas'
 * damage thresholds; none while he is not in play
 */
export function damageHastur(game: GameContext, story: InstId, perInvestigator: number): Queued[] {
  const h = hastur(game);
  if (!h) return [];
  let amount = perInvestigator * playerCount(game);
  if (flags.named(game, HEALTH_FLOOR) && !flags.rememberedFact.get(game, SECRET))
    amount = Math.min(amount, enemyStat(game, h.id, "health") - 2 * playerCount(game) - h.damage);
  return [
    ...(amount > 0 ? [damageEnemy({ enemy: h.id, amount, by: null, source: story })] : []),
    runScript({ code: SCENARIO, fn: "thresholds", ctx: { source: null } }),
  ];
}

/** an enemy exhausted and disengaged from all investigators */
export function stun(game: GameContext, id: InstId) {
  exhaustEnemy(game, id);
  setEngaged(game, id, null);
  emit(game, EVENT.Evade, `${def(game, id).name} is exhausted and disengaged`, { card: id });
}

/** "Flip this card back over. For the remainder of the game, it cannot be flipped over again." */
export const lock = (game: GameContext, loc: InstId) =>
  flags.rememberedFact.set(game, locked(loc), true);

/** "Remove this card from the game, and replace it with another set-aside copy of <it>": the copy takes its place */
export function replaceWithCopy(game: GameContext, story: InstId) {
  const slot = SLOTS.find((s) => s.includes(def(game, story).front ?? "")) ?? [];
  const copy = allCards(game).find(
    (c) => slot.includes(c.code) && c.zone === ZONE.SetAside && c.id !== story,
  );
  if (!copy) return;
  const cell = cellOf(game, story);
  moveCard(game, copy.id, ZONE.Location);
  if (cell) setCell(game, copy.id, cell);
  for (const i of turnOrder(game))
    if (inv(game, i).location === story) placeInvestigator(game, i, copy.id);
  for (const c of allCards(game))
    if (c.location === story && (c.zone === ZONE.Enemy || c.zone === ZONE.Attached))
      setCardLocation(game, c.id, copy.id);
  // "Add clues to that copy until it has clues on it equal to its clue value": it is revealed with its clues
  queue(game, revealLocation(copy.id));
}

/** agenda 1 and 2: "If there is at least 3 / 5 [per_investigator] damage on Hastur: Advance this agenda" */
function thresholds(game: GameContext) {
  const n = hasturDamage(game);
  if (
    (agendaIs(game, MADNESS_COILS) && n >= 3 * playerCount(game)) ||
    (agendaIs(game, MADNESS_DROWNS) && n >= 5 * playerCount(game))
  )
    queue(game, advanceAgenda());
}

export default {
  fns: {
    strangerAside: pallid.fns!.strangerAside,
    /** act 2's version by Conviction and Doubt; a tie of 6 or more waits for the lead's choice on the first turn */
    searchForTheStranger(game: GameContext) {
      const [c, d] = [count(game, "conviction"), count(game, "doubt")];
      const act2 = deckCards(game, "act")[0];
      if (!act2 || c + d <= 5) return;
      if (d > c) setCode(game, act2, SEARCH_V2);
      else if (c > d) setCode(game, act2, SEARCH_V3);
      else flags.rememberedFact.set(game, ACT2_CHOICE, true);
    },
    /** each investigator takes direct horror equal to half their sanity (it can't defeat them) */
    realmOfMadness(game: GameContext) {
      for (const i of turnOrder(game))
        addCounter(game, i, "horror", Math.floor(maxSanity(game, i) / 2));
    },
    /** Doubt and Conviction tied: the lead chooses v.II or v.III */
    chooseAct2(game: GameContext, run: ScriptRun) {
      const act2 = deckCards(game, "act")[0];
      if (!act2) return flags.rememberedFact.clear(game, ACT2_CHOICE);
      const code = run.choose<string>(
        [
          {
            id: SEARCH_V2,
            label: "Search For the Stranger (v. II)",
            value: SEARCH_V2,
            key: "option.dcaAct2.v2",
          },
          {
            id: SEARCH_V3,
            label: "Search For the Stranger (v. III)",
            value: SEARCH_V3,
            key: "option.dcaAct2.v3",
          },
        ],
        { text: "Use which version of act 2?", key: "dcaAct2" },
        { auto: false, who: leadInvestigator(game) },
      );
      flags.rememberedFact.clear(game, ACT2_CHOICE);
      setCode(game, act2, code);
    },
    thresholds,
    /** a story's "exhaust Hastur and disengage him from all investigators", after its damage */
    stunHastur(game: GameContext) {
      const h = hastur(game);
      if (h) stun(game, h.id);
    },
    /** a story's "replace it with another set-aside copy", after its other effects */
    replace(game: GameContext, run: ScriptRun) {
      replaceWithCopy(game, run.source);
    },
  },
  hooks: {
    checkObjectives(game: GameContext) {
      thresholds(game);
      possessionKills(game);
    },
    /**
     * The sanity rule: horror alone never defeats an investigator. The Man in the Pallid Mask by act 2's version (v.I:
     * never; v.II: only by his [action] ability, which advances the act; v.III: only by damage, which advances it).
     * Hastur not while agenda 1 or 2 is current, nor on agenda 3 unless an investigator knows the secret.
     */
    wouldBeDefeated(game: GameContext, who: InvId | InstId, by: string) {
      if (invIf(game, who)) return by === "horror";
      const e = cardIf(game, who);
      if (!e) return false;
      if (e.code === MITPM) {
        if (actIs(game, SEARCH_V1)) return true;
        if (!actIs(game, SEARCH_V2) && !actIs(game, SEARCH_V3)) return false;
        const byDamage = e.damage >= enemyStat(game, e.id, "health");
        if (byDamage === actIs(game, SEARCH_V3)) queue(game, advanceAct({ by: "objective" }));
        return true;
      }
      if (e.code in HASTURS)
        return !(agendaIs(game, MADNESS_DIES) && !!flags.rememberedFact.get(game, SECRET));
      return false;
    },
    ended(game: GameContext) {
      const possessed = turnOrder(game).filter((i) =>
        inv(game, i).hand.some((h) => POSSESSION.includes(card(game, h).code)),
      );
      // the epilogue is read by them alone: the flow reads this list
      if (possessed.length) flags.cardsEntry.set(game, ["campaign_notes", "possessed"], possessed);
    },
  },
} satisfies CardScript;
