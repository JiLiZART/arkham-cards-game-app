// The Unspeakable Oath (the token table's functions and conditions, and those its cards share, are its reference
// card's, 03159, which Return to The Unspeakable Oath plays with too): one Western and one Eastern
// Asylum Halls (the investigators begin at the one of their choice: agenda 1 asks on each first turn); the Monster and
// Possessed piles set aside; Constance Dumaine set aside unless slain; if she was interviewed, each investigator's top
// card is a Courage asset (named `courage` tokens: 2 horror it takes for them, the card beneath their investigator).
// Act 3's objective is checked after each action; act 4's (each undefeated investigator resigned) when everyone is
// gone: Resolution 2 if the keys were taken by force, else 3; with no one resigned there is no resolution. As it ends
// the campaign log learns who was defeated (driven insane), whether Constance was slain and what became of Daniel.
import {
  addTokens,
  allCards,
  card,
  cardIf,
  cardsBeneath,
  type CardScript,
  createCard,
  currentAct,
  flags,
  type GameContext,
  inv,
  locations,
  placeInvestigator,
  putBeneath,
  rememberedCount,
  turnOrder,
  ZONE,
  queue,
  advanceAct,
  endScenario,
} from "../../../../src/engine/api";

/** the Monster pile and the Possessed pile, each set aside on its own */
export const MONSTERS = ["03088", "03089", "03183", "01175"];
export const POSSESSED = ["03095", "03096", "03184"];
export const CONSTANCE = "03065b";
export const DANIEL = "03182a";
export const DANIEL_ENEMY = "03182b";
export const DANIELS_CELL = "03178";
export const GARDEN = "03176";
export const HALLS = ["03168", "03169", "03170", "03171"];
const ACT_3 = "03166";
export const ACT_4 = "03167";
/** "Remember that 'you took the keys by force'" (act 1's back) */
export const BY_FORCE = "tookTheKeysByForce";
/** act 3's six: four of them advance it */
export const ESCAPE_PLANS = [
  "knowTheGuardsPatrols",
  "setAFireInTheKitchen",
  "incitedAFightAmongstThePatients",
  "releasedADangerousPatient",
  "recalledTheWayOut",
  "distractedTheGuards",
];
/** investigators still to choose their Asylum Halls (agenda 1, on their first turn) */
export const CHOOSE_HALL = "tuoChooseHall";
export const COURAGE = "courage";

export const actIs = (game: GameContext, code: string) =>
  cardIf(game, currentAct(game))?.code === code;
export const hallsInPlay = (game: GameContext) =>
  locations(game).filter((l) => HALLS.includes(l.code));

export default {
  fns: {
    /** everyone at the Western Asylum Halls until their first turn, when they choose (agenda 1) */
    halls(game: GameContext) {
      const west = hallsInPlay(game).find((l) => l.code === "03168" || l.code === "03169");
      for (const i of turnOrder(game)) if (west) placeInvestigator(game, i, west.id);
      flags.setNamed(game, CHOOSE_HALL, true);
    },
    /** "If Constance Dumaine is not listed under VIPs Slain": she waits set aside for agenda 2's back */
    constanceAside(game: GameContext) {
      createCard(game, CONSTANCE, ZONE.SetAside);
    },
    /** Constance was interviewed: each investigator's top card facedown as a Courage asset with 2 sanity */
    courage(game: GameContext) {
      for (const i of turnOrder(game)) {
        const top = inv(game, i).deck[0];
        if (!top) continue;
        putBeneath(game, top, inv(game, i).cardId);
        addTokens(game, i, COURAGE, 2);
      }
    },
  },
  hooks: {
    /** act 3: "If investigators have performed 4 of the following, you must advance" */
    checkObjectives(game: GameContext) {
      if (actIs(game, ACT_3) && rememberedCount(game, ESCAPE_PLANS) >= 4) queue(game, advanceAct());
    },
    /** act 4's objective, or agenda 3b's "those investigators may immediately advance to act 4b" */
    allEliminated(game: GameContext) {
      const resigned = turnOrder(game).some((i) => inv(game, i).status === "resigned");
      queue(
        game,
        endScenario({
          id: !resigned ? "none" : flags.rememberedFact.get(game, BY_FORCE) ? "R2" : "R3",
        }),
      );
    },
    ended(game: GameContext) {
      // Investigator Defeat: each investigator who was defeated is driven insane
      for (const i of turnOrder(game))
        if (inv(game, i).status === "defeated") flags.insane.set(game, i, true);
      if (allCards(game).some((c) => c.code === CONSTANCE && c.zone === ZONE.Victory))
        flags.logEntry.set(game, ["vipsSlain", CONSTANCE], true);
      // Interlude II: Daniel under the control of an investigator who resigned, or the enemy Daniel in play
      if (turnOrder(game).some((i) => flags.resignedWith.get(game, i)?.includes(DANIEL)))
        flags.logEntry.set(game, ["hidden", "danielSurvived"], true);
      if (allCards(game).some((c) => c.code === DANIEL_ENEMY && c.zone === ZONE.Enemy))
        flags.logEntry.set(game, ["hidden", "danielPossessed"], true);
    },
  },
} satisfies CardScript;

/** the facedown Courage card beneath an investigator, discarded when its 2 sanity are gone */
export const courageCard = (game: GameContext, i: string) =>
  cardsBeneath(game, inv(game, i).cardId).find((id) => card(game, id).owner === i);
