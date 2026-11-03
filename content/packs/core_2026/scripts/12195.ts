// Torment — name a card type: each investigator discards 1 card of that type
import {
  activeInvs,
  def,
  discard,
  inv,
  type CardScript,
  type GameContext,
  CHOICE,
  type ScriptRun,
  asString,
  queue,
  runScript,
} from "../../../../src/engine/api";

const TYPES = ["asset", "event", "skill"] as const;

export default {
  fns: {
    torment(game: GameContext, run: ScriptRun) {
      const type = run.choose<string>(
        TYPES.map((t) => ({ id: t, label: t[0].toUpperCase() + t.slice(1), value: t })),
        { text: "Torment: name a card type", key: "chooseOne" },
        { auto: false, kind: CHOICE.Generic },
      );
      for (const i of activeInvs(game))
        queue(
          game,
          runScript({ code: "12195", fn: "discardOne", ctx: { ...run.ctx, inv: i }, args: type }),
        );
    },
    discardOne(game: GameContext, run: ScriptRun) {
      const who = run.ctx.inv!;
      const type = asString(run.args);
      const cards = inv(game, who).hand.filter((h) => def(game, h).type === type);
      if (!cards.length) return;
      const pick = run.chooseCard(
        cards,
        { text: `Torment: discard 1 ${type}`, key: "discardN", vars: { n: 1 } },
        { kind: CHOICE.Generic, who: who },
      );
      discard(game, pick);
    },
  },
} satisfies CardScript;
