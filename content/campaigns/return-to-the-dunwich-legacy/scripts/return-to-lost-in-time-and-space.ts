// Return to Lost in Time and Space (setup card 51053): the base scenario's script, with the box's rules over it —
// Realms Beyond in play with Yog-Sothoth there, taking whoever a forced effect would move to Another Dimension; Into
// the Beyond (v. II)'s objective; and Seth Bishop devoured once he and Yog-Sothoth share a location.
import {
  card,
  cardIf,
  type CardScript,
  composeScript,
  currentAct,
  def,
  emit,
  enemies,
  EVENT,
  flags,
  type GameContext,
  type InstId,
  invsAt,
  moveCard,
  queue,
  setCounter,
  advanceAct,
  ZONE,
} from "../../../../src/engine/api";
import base, {
  ANOTHER_DIMENSION,
  EDGE,
  inPlay,
  sweep,
  YOG,
} from "../../the-dunwich-legacy/scripts/lost-in-time-and-space";

export const REALMS = "51057";
export const SETH = "51056";
const ACT_2 = "51055";
/** Breaking Through (v. II)'s back: "Ignore the text on Realms Beyond while resolving this ability" */
export const REALMS_IGNORED = "realmsIgnored";

/** Realms Beyond in play, its text not ignored */
export const realms = (game: GameContext): InstId | undefined =>
  flags.named(game, REALMS_IGNORED) ? undefined : inPlay(game, REALMS);
/** where a forced effect moving someone to Another Dimension takes them: Realms Beyond while its text holds */
export const anotherDimension = (game: GameContext): InstId | undefined =>
  realms(game) ?? inPlay(game, ANOTHER_DIMENSION);

/** Seth Bishop: "After Yog-Sothoth enters Seth Bishop's location (or vice versa): … Remove Seth Bishop from the game.
 * Heal 6 damage from Yog-Sothoth." */
export function devourSeth(game: GameContext) {
  const seth = enemies(game).find((e) => e.code === SETH);
  const yog = enemies(game).find((e) => e.code === YOG);
  if (!seth || !yog || !seth.location || seth.location !== yog.location) return;
  moveCard(game, seth.id, ZONE.Removed);
  setCounter(game, yog.id, "damage", Math.max(0, card(game, yog.id).damage - 6));
  emit(game, EVENT.Remove, `${def(game, seth.id).name} is devoured whole by Yog-Sothoth`, {
    card: seth.id,
  });
}

/** what the box adds to the base scenario */
const returnTo: CardScript = {
  hooks: {
    /** Another Dimension's forced, with Realms Beyond's "move them here instead. Cannot be canceled." */
    locationLeavesPlay(game: GameContext, loc: InstId) {
      const to = anotherDimension(game);
      if (to) sweep(game, loc, to);
    },
    checkObjectives(game: GameContext) {
      devourSeth(game);
      // Into the Beyond (v. II): "If an investigator enters The Edge of the Universe, advance"
      const edge = inPlay(game, EDGE);
      if (cardIf(game, currentAct(game))?.code === ACT_2 && edge && invsAt(game, edge).length)
        queue(game, advanceAct());
    },
  },
};

export default composeScript(base, returnTo);
