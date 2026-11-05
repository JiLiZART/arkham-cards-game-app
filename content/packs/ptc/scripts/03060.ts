// Royal Emissary (Curtain Call) — at the end of the enemy phase, each investigator at its location or a connecting
// location takes 1 horror.
import {
  type CardScript,
  connections,
  type GameContext,
  invsAt,
  type ScriptRun,
  queue,
  dealDamage,
  cardIf,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "forced", trigger: "enemyPhaseEnds", run: "dread" }],
  fns: {
    dread(game: GameContext, run: ScriptRun) {
      const at = cardIf(game, run.source)?.location;
      if (!at) return;
      const near = [at, ...connections(game, at)].flatMap((l) => invsAt(game, l));
      queue(
        game,
        ...near.map((i) =>
          dealDamage({ inv: i, damage: 0, horror: 1, direct: false, source: run.source }),
        ),
      );
    },
  },
} satisfies CardScript;
