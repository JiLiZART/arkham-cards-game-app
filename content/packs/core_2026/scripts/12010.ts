// Dexter Drake — after you play an asset, return another of your assets to your hand or play a different one;
// elder sign: you may return an asset at your location to its owner's hand
import {
  ask,
  canPlay,
  controlled,
  def,
  emit,
  inv,
  invsAt,
  moveCard,
  push,
  type CardScript,
  type EffCtx,
  type G,
  type InstId,
  type Step,
} from "../../../../src/engine/api";

const story = (g: G, id: InstId) => def(g, id).traits.includes("Story");

function returnToHand(g: G, id: InstId) {
  const c = g.s.cards[id];
  if (!c?.owner) return;
  moveCard(g, id, "hand", { inv: c.owner });
  emit(g, "returned", `${def(g, id).name} returns to its owner's hand`, { inv: c.owner, card: id });
}

export default {
  abilities: [{ kind: "elderSign", tokenValue: 1, run: "elder" }],
  fns: {
    shuffleAssets(g: G, ctx: EffCtx, _args: unknown, step?: Step) {
      const you = ctx.you!;
      const back = controlled(g, you).filter((c) => c.id !== ctx.card && !story(g, c.id));
      const play = inv(g, you).hand.filter(
        (h) =>
          def(g, h).type === "asset" &&
          def(g, h).name !== def(g, ctx.card!).name &&
          (canPlay(g, you, h, false) || canPlay(g, you, h, true)),
      );
      const pick = ask<InstId>(
        g,
        step!,
        you,
        "generic",
        "Dexter Drake: return an asset you control, or play an asset from your hand",
        [
          ...back.map((c) => ({
            id: `back:${c.id}`,
            label: `Return ${def(g, c.id).name} to your hand`,
            card: c.id,
            value: `back:${c.id}`,
          })),
          ...play.map((h) => ({
            id: `play:${h}`,
            label: `Play ${def(g, h).name}`,
            card: h,
            value: `play:${h}`,
          })),
          { id: "none", label: "Neither", value: "none" },
        ],
        { key: "chooseOne" },
      );
      if (pick === undefined || pick === "none") return;
      const [kind, id] = pick.split(":");
      if (kind === "back") returnToHand(g, id);
      else push(g, { t: "PlayCard", inv: you, card: id });
    },
    // resolved with the token, which can't ask: the choice waits in a step of its own
    elder(g: G, ctx: EffCtx) {
      const here = invsAt(g, inv(g, ctx.you!).location);
      const assets = here.flatMap((i) => controlled(g, i)).filter((c) => !story(g, c.id));
      if (!assets.length) return;
      push(g, { t: "Script", code: "12010", fn: "elderPick", ctx, args: assets.map((a) => a.id) });
    },
    elderPick(g: G, ctx: EffCtx, args: InstId[], step?: Step) {
      const pick = ask<InstId>(
        g,
        step!,
        ctx.you!,
        "generic",
        "Dexter Drake: return an asset at your location to its owner's hand?",
        [
          ...args
            .filter((id) => g.s.cards[id]?.zone === "play")
            .map((id) => ({ id, label: `Return ${def(g, id).name}`, card: id, value: id })),
          { id: "none", label: "No", value: "none" },
        ],
        { key: "chooseOne" },
      );
      if (pick === undefined || pick === "none") return;
      returnToHand(g, pick);
    },
  },
} satisfies CardScript;
