// Terror from Beyond — a card type is chosen (two if another copy was drawn this phase): each player discards each card
// of it from hand
import {
  asString,
  card,
  type CardScript,
  currentPhase,
  currentRound,
  def,
  discard,
  flags,
  type GameContext,
  inv,
  turnOrder,
  type ScriptRun,
  queue,
  runScript,
} from "../../../../src/engine/api";

const TYPES = ["asset", "event", "skill"];

const ask = (run: ScriptRun, left: string[]) =>
  run.choose<string>(
    left.map((t) => ({ id: t, label: t, value: t, key: `card.type.${t}` })),
    { text: "Choose a card type to discard from every hand", key: "terrorFromBeyond" },
    { auto: false },
  );

function discardTypes(game: GameContext, types: string[]) {
  for (const i of turnOrder(game))
    for (const h of inv(game, i).hand.slice())
      if (types.includes(def(game, h).type)) discard(game, h);
}

export default {
  abilities: [{ kind: "revelation", run: "terror" }],
  fns: {
    terror(game: GameContext, run: ScriptRun) {
      const key = `${card(game, run.source).code}:${currentRound(game)}:${currentPhase(game)}`;
      const second = (flags.copiesDrawn.get(game, key) ?? 0) > 0;
      const first = ask(run, TYPES);
      flags.copiesDrawn.add(game, key, 1);
      // one choice a step: the second type is its own
      if (second)
        queue(game, runScript({ code: "02101", fn: "another", ctx: run.ctx, args: first }));
      else discardTypes(game, [first]);
    },
    another(game: GameContext, run: ScriptRun) {
      const first = asString(run.args) ?? "";
      discardTypes(game, [
        first,
        ask(
          run,
          TYPES.filter((t) => t !== first),
        ),
      ]);
    },
  },
} satisfies CardScript;
