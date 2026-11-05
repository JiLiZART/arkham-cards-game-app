// Stalked in the Dark — if Hunting Horror is in play, it readies, engages you (coming to your location) and attacks each
// investigator at your location; otherwise this gains surge
import {
  attackKey,
  type CardScript,
  def,
  emit,
  flags,
  type GameContext,
  inv,
  invsAt,
  ready,
  setCardLocation,
  setEngaged,
  EVENT,
  type ScriptRun,
  queue,
  enemyAttacks,
} from "../../../../src/engine/api";
import { horrorInPlay } from "./02141";

export default {
  abilities: [{ kind: "revelation", run: "stalk" }],
  fns: {
    stalk(game: GameContext, run: ScriptRun) {
      const h = horrorInPlay(game);
      const here = inv(game, run.you).location;
      if (!h || !here) {
        flags.surge.set(game, run.source, true);
        return;
      }
      ready(game, h.id);
      setCardLocation(game, h.id, here);
      setEngaged(game, h.id, run.you);
      emit(game, EVENT.Engage, `${def(game, h.id).name} engages ${inv(game, run.you).name}`, {
        inv: run.you,
        card: h.id,
      });
      queue(
        game,
        ...invsAt(game, here).map((i) =>
          enemyAttacks({ enemy: h.id, inv: i, aoo: false, key: attackKey(game) }),
        ),
      );
    },
  },
} satisfies CardScript;
