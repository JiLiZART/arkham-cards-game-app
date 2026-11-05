// The Cult's Search — with a [[Cultist]] enemy with doom in play, all doom on each Cultist enemy moves to the current
// agenda (which may advance); with none, the drawer searches the encounter deck and discard pile for a Cultist enemy
// and draws it.
import {
  addCounter,
  type CardScript,
  currentAgenda,
  def,
  emit,
  enemies,
  type GameContext,
  EVENT,
  type ScriptRun,
  queue,
  checkDoom,
  resolveEffect,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "search" }],
  fns: {
    search(game: GameContext, run: ScriptRun) {
      const cultists = enemies(game).filter((e) => def(game, e.id).traits.includes("Cultist"));
      const agenda = currentAgenda(game);
      if (agenda && cultists.some((e) => e.doom > 0)) {
        let n = 0;
        for (const e of cultists) {
          n += e.doom;
          addCounter(game, e.id, "doom", -e.doom);
        }
        addCounter(game, agenda, "doom", n);
        emit(
          game,
          EVENT.Doom,
          `${n} doom moves from the Cultist enemies to ${def(game, agenda).name}`,
          {
            card: agenda,
            data: { n },
          },
        );
        queue(game, checkDoom());
        return;
      }
      queue(
        game,
        resolveEffect({
          effect: { op: "searchEncounterDraw", filter: { type: "enemy", trait: "Cultist" } },
          ctx: { ...run.ctx, you: run.you },
        }),
      );
    },
  },
} satisfies CardScript;
