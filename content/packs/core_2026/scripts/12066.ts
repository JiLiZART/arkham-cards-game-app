// Will of the Cosmos — 1 doom on a player card you control; discover 1 clue here and 1 at another revealed location
import {
  card,
  controlled,
  def,
  inv,
  locations,
  push,
  type CardScript,
  type GameContext,
  type InstId,
  STEP,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "onPlay", run: "doom" }],
  fns: {
    doom(game: GameContext, run: ScriptRun) {
      const you = run.you;
      const mine = [inv(game, you).cardId, ...controlled(game, you).map((c) => c.id)];
      const pick = run.choose<InstId>(
        mine.map((id) => ({ id, label: def(game, id).name, card: id, value: id })),
        { text: "Will of the Cosmos: place 1 doom on a card you control", key: "chooseOne" },
        { who: you },
      );
      push(
        game,
        { t: STEP.PlaceDoom, card: pick, n: 1 },
        { t: STEP.Effects, effects: [{ op: "discoverClues", amount: 1 }], ctx: run.ctx },
        { t: STEP.Script, code: "12066", fn: "elsewhere", ctx: run.ctx },
      );
    },
    elsewhere(game: GameContext, run: ScriptRun) {
      const you = run.you;
      const here = inv(game, you).location;
      const there = locations(game).filter(
        (l) => l.id !== here && l.revealed && card(game, l.id).clues > 0,
      );
      if (!there.length) return;
      const pick = run.chooseCard(
        there.map((l) => l.id),
        {
          text: "Will of the Cosmos: discover 1 clue at another revealed location",
          key: "chooseClueLocation",
        },
        { who: you },
      );
      push(game, { t: STEP.DiscoverClues, inv: you, location: pick, n: 1 });
    },
  },
} satisfies CardScript;
