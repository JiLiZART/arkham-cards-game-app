// Crisis of Identity — Lola Hayes discards every card she controls of her role, then the top card of her deck, and
// her role becomes that card's class (Neutral for a weakness)
import {
  type CardScript,
  controlled,
  def,
  discard,
  discardTop,
  emit,
  EVENT,
  flags,
  type GameContext,
  inv,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "crisis" }],
  fns: {
    crisis(game: GameContext, run: ScriptRun) {
      const role = flags.role.get(game, run.you);
      if (role)
        for (const c of controlled(game, run.you)) {
          const d = def(game, c.id);
          if ((d.factions ?? [d.faction]).includes(role)) discard(game, c.id);
        }
      const [top] = discardTop(game, run.you, 1);
      if (!top) return;
      const d = def(game, top);
      const next = d.subtype ? "neutral" : d.faction;
      flags.role.set(game, run.you, next);
      emit(game, EVENT.Place, `${inv(game, run.you).name}'s role is now ${next}`, {
        inv: run.you,
        data: { role: next },
      });
    },
  },
} satisfies CardScript;
