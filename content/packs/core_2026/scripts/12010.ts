// Dexter Drake — after you play an asset, return another of your assets to your hand or play a different one;
// elder sign: you may return an asset at your location to its owner's hand
import {
  canPlay,
  cardIf,
  type CardScript,
  controlled,
  def,
  emit,
  type GameContext,
  type InstId,
  inv,
  invsAt,
  moveCard,
  push,
  EVENT,
  ZONE,
  CHOICE,
  STEP,
  type ScriptRun,
  asStrings,
} from "../../../../src/engine/api";

const story = (game: GameContext, id: InstId) => def(game, id).traits.includes("Story");

function returnToHand(game: GameContext, id: InstId) {
  const c = cardIf(game, id);
  if (!c?.owner) return;
  moveCard(game, id, ZONE.Hand, { inv: c.owner });
  emit(game, EVENT.Returned, `${def(game, id).name} returns to its owner's hand`, {
    inv: c.owner,
    card: id,
  });
}

export default {
  abilities: [{ kind: "elderSign", tokenValue: 1, run: "elder" }],
  fns: {
    shuffleAssets(game: GameContext, run: ScriptRun) {
      const you = run.you;
      const back = controlled(game, you).filter((c) => c.id !== run.ctx.card && !story(game, c.id));
      const play = inv(game, you).hand.filter(
        (h) =>
          def(game, h).type === "asset" &&
          def(game, h).name !== def(game, run.ctx.card!).name &&
          (canPlay(game, you, h, false) || canPlay(game, you, h, true)),
      );
      const pick = run.choose<InstId>(
        [
          ...back.map((c) => ({
            id: `back:${c.id}`,
            label: `Return ${def(game, c.id).name} to your hand`,
            card: c.id,
            value: `back:${c.id}`,
          })),
          ...play.map((h) => ({
            id: `play:${h}`,
            label: `Play ${def(game, h).name}`,
            card: h,
            value: `play:${h}`,
          })),
          { id: "none", label: "Neither", value: "none" },
        ],
        {
          text: "Dexter Drake: return an asset you control, or play an asset from your hand",
          key: "chooseOne",
        },
        { auto: false, kind: CHOICE.Generic, who: you },
      );
      if (pick === "none") return;
      const [kind, id] = pick.split(":");
      if (kind === "back") returnToHand(game, id);
      else push(game, { t: STEP.PlayCard, inv: you, card: id });
    },
    // resolved with the token, which can't ask: the choice waits in a step of its own
    elder(game: GameContext, run: ScriptRun) {
      const here = invsAt(game, inv(game, run.you).location);
      const assets = here.flatMap((i) => controlled(game, i)).filter((c) => !story(game, c.id));
      if (!assets.length) return;
      push(game, {
        t: STEP.Script,
        code: "12010",
        fn: "elderPick",
        ctx: run.ctx,
        args: assets.map((a) => a.id),
      });
    },
    elderPick(game: GameContext, run: ScriptRun) {
      const pick = run.choose<InstId>(
        [
          ...asStrings(run.args)
            .filter((id) => cardIf(game, id)?.zone === "play")
            .map((id) => ({ id, label: `Return ${def(game, id).name}`, card: id, value: id })),
          { id: "none", label: "No", value: "none" },
        ],
        {
          text: "Dexter Drake: return an asset at your location to its owner's hand?",
          key: "chooseOne",
        },
        { auto: false, kind: CHOICE.Generic },
      );
      if (pick === "none") return;
      returnToHand(game, pick);
    },
  },
} satisfies CardScript;
