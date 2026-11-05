// Chaos in the Clover Club (The House Always Wins, agenda 3) — as the enemy phase begins, each Criminal enemy at a
// location with an Abomination enemy is discarded; back: (→R4)
import {
  type CardScript,
  def,
  discard,
  enemies,
  type GameContext,
} from "../../../../src/engine/api";

export default {
  abilities: [
    { kind: "forced", trigger: "phaseBegins", condition: { phase: "enemy" }, run: "chaos" },
    { kind: "revelation", effects: [{ op: "resolution", id: "R4" }] },
  ],
  fns: {
    chaos(game: GameContext) {
      const all = enemies(game);
      const has = (e: { id: string }, trait: string) => def(game, e.id).traits.includes(trait);
      const abominations = new Set(all.filter((e) => has(e, "Abomination")).map((e) => e.location));
      for (const e of all)
        if (has(e, "Criminal") && abominations.has(e.location)) discard(game, e.id);
    },
  },
} satisfies CardScript;
