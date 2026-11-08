// Keeper of the Oath (Return to Echoes of the Past, two copies set aside; the scenario spawns one as act 2 and act 3
// begin) — hunter while the current act's number is greater than the current agenda's; at the end of the enemy phase,
// each investigator whose location shares a Trait with its location moves 1 clue to it (clues on an enemy turn to doom:
// the Echoes agendas).
import {
  addCounter,
  card,
  cardIf,
  type CardScript,
  currentAct,
  currentAgenda,
  def,
  emit,
  EVENT,
  type GameContext,
  inv,
  invName,
  openWindow,
  queue,
  type ScriptRun,
  turnOrder,
} from "../../../../src/engine/api";

const stage = (game: GameContext, id: string | null) => (id ? (def(game, id).stage ?? 0) : 0);

export default {
  abilities: [
    {
      kind: "constant",
      condition: { script: "actAhead" },
      modifiers: [{ keyword: "hunter", scope: "self" }],
    },
    { kind: "forced", trigger: "enemyPhaseEnds", run: "collect" },
  ],
  conditions: {
    actAhead: (game: GameContext) =>
      stage(game, currentAct(game)) > stage(game, currentAgenda(game)),
  },
  fns: {
    collect(game: GameContext, run: ScriptRun) {
      const at = cardIf(game, run.source)?.location;
      if (!at) return;
      const traits = def(game, at).traits;
      let n = 0;
      for (const i of turnOrder(game)) {
        const me = inv(game, i);
        if (me.status !== "playing" || !me.location || me.clues <= 0) continue;
        if (!def(game, me.location).traits.some((t) => traits.includes(t))) continue;
        addCounter(game, i, "clues", -1);
        addCounter(game, run.source, "clues", 1);
        n++;
        emit(
          game,
          EVENT.Clues,
          `${invName(game, i)} moves 1 clue to ${def(game, run.source).name}`,
          {
            inv: i,
            card: run.source,
            data: { n: 1, placed: true },
          },
        );
      }
      if (n && card(game, run.source).clues)
        queue(game, openWindow("cluesPlaced", { card: run.source, amount: n }));
    },
  },
} satisfies CardScript;
