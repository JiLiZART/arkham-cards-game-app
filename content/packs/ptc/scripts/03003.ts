// Sefina Rousseau — her opening hand is 13 cards: up to 5 events go beneath her, she keeps 8, the rest are discarded
// (no mulligan); her action and her elder sign draw an event from beneath her (cards.json)
import {
  argField,
  type CardScript,
  cardsBeneath,
  def,
  discard,
  emit,
  EVENT,
  flags,
  type GameContext,
  inv,
  moveCard,
  putBeneath,
  queue,
  runScript,
  type ScriptRun,
  shuffleDeck,
  ZONE,
} from "../../../../src/engine/api";

const SEFINA = "03003";
/** The Painted World: "Cannot be placed beneath Sefina Rousseau" */
const PAINTED_WORLD = "03012";
const BENEATH_MAX = 5;
const KEEP = 8;

const cardOpt = (game: GameContext, id: string) => ({
  id,
  label: def(game, id).name,
  card: id,
  value: id,
});

/** an event from beneath her into her hand; `optional`: she may take none (her elder sign) */
function drawFromBeneath(game: GameContext, run: ScriptRun, optional: boolean) {
  const under = cardsBeneath(game, run.source);
  if (!under.length) return;
  const pick = run.choose<string>(
    [
      ...under.map((id) => cardOpt(game, id)),
      ...(optional
        ? [{ id: "none", label: "Draw none", value: "none", key: "option.drawNone" }]
        : []),
    ],
    { text: "Choose an event beneath Sefina Rousseau to draw", key: "sefinaDraw" },
    { auto: !optional },
  );
  if (pick === "none") return;
  moveCard(game, pick, ZONE.Hand, { inv: run.you });
  emit(game, EVENT.Search, `${inv(game, run.you).name} draws ${def(game, pick).name}`, {
    inv: run.you,
    card: pick,
  });
}

export default {
  openingHand: { draw: 13, fn: "opening", noMulligan: true },
  fns: {
    /** one choice a step: events beneath her until she is done (or 5 are), then cards discarded down to 8 */
    opening(game: GameContext, run: ScriptRun) {
      const me = inv(game, run.you);
      const placing = !argField(run.args, "placed");
      const events = me.hand.filter(
        (h) => def(game, h).type === "event" && def(game, h).code !== PAINTED_WORLD,
      );
      if (placing && events.length && cardsBeneath(game, run.source).length < BENEATH_MAX) {
        const pick = run.choose<string>(
          [
            { id: "done", label: "Done", value: "done", key: "option.done" },
            ...events.map((id) => cardOpt(game, id)),
          ],
          { text: "Choose an event to place beneath Sefina Rousseau", key: "sefinaBeneath" },
          { auto: false },
        );
        if (pick !== "done") putBeneath(game, pick, run.source);
        queue(
          game,
          runScript({
            code: SEFINA,
            fn: "opening",
            ctx: run.ctx,
            args: pick === "done" ? { placed: true } : {},
          }),
        );
        return;
      }
      if (me.hand.length > KEEP) {
        const pick = run.choose<string>(
          me.hand.map((id) => cardOpt(game, id)),
          {
            text: `Discard down to ${KEEP} cards (${me.hand.length} in hand)`,
            key: "sefinaDiscard",
            vars: { n: me.hand.length - KEEP },
          },
          { auto: false },
        );
        discard(game, pick);
        queue(
          game,
          runScript({ code: SEFINA, fn: "opening", ctx: run.ctx, args: { placed: true } }),
        );
        return;
      }
      // the weaknesses set aside as she drew go back into her deck (as after a mulligan)
      const aside = flags.aside.get(game, run.you) ?? [];
      for (const h of aside) moveCard(game, h, ZONE.Deck);
      if (aside.length) shuffleDeck(game, run.you);
      flags.aside.clear(game, run.you);
    },
    drawEvent(game: GameContext, run: ScriptRun) {
      drawFromBeneath(game, run, false);
    },
    mayDrawEvent(game: GameContext, run: ScriptRun) {
      drawFromBeneath(game, run, true);
    },
  },
} satisfies CardScript;
