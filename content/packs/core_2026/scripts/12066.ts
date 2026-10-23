// Will of the Cosmos — 1 doom on a player card you control; discover 1 clue here and 1 at another revealed location
import {
  ask,
  card,
  controlled,
  def,
  inv,
  locations,
  push,
  type CardScript,
  type EffCtx,
  type G,
  type InstId,
  type Step,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "onPlay", run: "doom" }],
  fns: {
    doom(g: G, ctx: EffCtx, _args: unknown, step?: Step) {
      const you = ctx.you!;
      const mine = [inv(g, you).cardId, ...controlled(g, you).map((c) => c.id)];
      const pick = ask<InstId>(
        g,
        step!,
        you,
        "target",
        "Will of the Cosmos: place 1 doom on a card you control",
        mine.map((id) => ({ id, label: def(g, id).name, card: id, value: id })),
        { auto: true, key: "chooseOne" },
      );
      if (pick === undefined) return;
      push(
        g,
        { t: "PlaceDoom", card: pick, n: 1 },
        { t: "Effects", effects: [{ op: "discoverClues", amount: 1 }], ctx },
        { t: "Script", code: "12066", fn: "elsewhere", ctx },
      );
    },
    elsewhere(g: G, ctx: EffCtx, _args: unknown, step?: Step) {
      const you = ctx.you!;
      const here = inv(g, you).location;
      const there = locations(g).filter(
        (l) => l.id !== here && l.revealed && card(g, l.id).clues > 0,
      );
      if (!there.length) return;
      const pick = ask<InstId>(
        g,
        step!,
        you,
        "target",
        "Will of the Cosmos: discover 1 clue at another revealed location",
        there.map((l) => ({ id: l.id, label: def(g, l.id).name, card: l.id, value: l.id })),
        { auto: true, key: "chooseClueLocation" },
      );
      if (pick === undefined) return;
      push(g, { t: "DiscoverClues", inv: you, location: pick, n: 1 });
    },
  },
} satisfies CardScript;
