// The Last King's reference card — the skull's failure: 1 doom on a [[Possessed]] enemy in play (Hard/Expert: the one
// with the most remaining health). (Return to The Last King plays with the same card and finds this through it.)
import {
  card,
  type CardScript,
  def,
  enemies,
  enemyStat,
  type GameContext,
  type ScriptRun,
  queue,
  placeDoom,
} from "../../../../src/engine/api";

export default {
  fns: {
    doomOnPossessed(game: GameContext, run: ScriptRun) {
      let pool = enemies(game).filter((e) => def(game, e.id).traits.includes("Possessed"));
      if (run.args === "mostHealth") {
        const left = (id: string) => enemyStat(game, id, "health") - card(game, id).damage;
        const most = Math.max(...pool.map((e) => left(e.id)));
        pool = pool.filter((e) => left(e.id) === most);
      }
      if (!pool.length) return;
      const pick = run.chooseCard(
        pool.map((e) => e.id),
        { text: "Place 1 doom on a Possessed enemy", key: "doomOnPossessed" },
      );
      queue(game, placeDoom({ card: pick, n: 1 }));
    },
  },
} satisfies CardScript;
