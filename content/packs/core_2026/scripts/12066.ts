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
  type GameContext,
  type InstId,
  type Step,
  CHOICE,
  STEP,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "onPlay", run: "doom" }],
  fns: {
    doom(game: GameContext, ctx: EffCtx, _args: unknown, step?: Step) {
      const you = ctx.you!;
      const mine = [inv(game, you).cardId, ...controlled(game, you).map((c) => c.id)];
      const pick = ask<InstId>(
        game,
        step!,
        you,
        CHOICE.Target,
        "Will of the Cosmos: place 1 doom on a card you control",
        mine.map((id) => ({ id, label: def(game, id).name, card: id, value: id })),
        { auto: true, key: "chooseOne" },
      );
      if (pick === undefined) return;
      push(
        game,
        { t: STEP.PlaceDoom, card: pick, n: 1 },
        { t: STEP.Effects, effects: [{ op: "discoverClues", amount: 1 }], ctx },
        { t: STEP.Script, code: "12066", fn: "elsewhere", ctx },
      );
    },
    elsewhere(game: GameContext, ctx: EffCtx, _args: unknown, step?: Step) {
      const you = ctx.you!;
      const here = inv(game, you).location;
      const there = locations(game).filter(
        (l) => l.id !== here && l.revealed && card(game, l.id).clues > 0,
      );
      if (!there.length) return;
      const pick = ask<InstId>(
        game,
        step!,
        you,
        CHOICE.Target,
        "Will of the Cosmos: discover 1 clue at another revealed location",
        there.map((l) => ({ id: l.id, label: def(game, l.id).name, card: l.id, value: l.id })),
        { auto: true, key: "chooseClueLocation" },
      );
      if (pick === undefined) return;
      push(game, { t: STEP.DiscoverClues, inv: you, location: pick, n: 1 });
    },
  },
} satisfies CardScript;
