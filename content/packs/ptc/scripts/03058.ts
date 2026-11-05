// Trap Room (Curtain Call) — after you reveal it: a Swarm of Rats from the encounter deck or its discard pile into play
// engaged with you (2 with 3 or 4 investigators); the encounter deck is shuffled if it was searched.
import {
  type CardScript,
  type GameContext,
  playerCount,
  type ScriptRun,
  queue,
  resolveEffect,
} from "../../../../src/engine/api";

const SWARM_OF_RATS = "01159";

export default {
  abilities: [{ kind: "forced", trigger: "revealed", run: "rats" }],
  fns: {
    rats(game: GameContext, run: ScriptRun) {
      const search = resolveEffect({
        effect: { op: "searchEncounterDraw", filter: { code: SWARM_OF_RATS } },
        ctx: { ...run.ctx, you: run.you },
      });
      queue(game, ...(playerCount(game) >= 3 ? [search, search] : [search]));
    },
  },
} satisfies CardScript;
