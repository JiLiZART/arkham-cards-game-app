// No Asylum (The Unspeakable Oath, act 4) — the unrevealed side of the [[Arkham Asylum]] locations is ignored (its
// data); the Garden gains a resign action while no ready enemy is there (the Garden's data, `gardenOpen`). Objective:
// each undefeated investigator has resigned (the scenario's `allEliminated`). Back: (→R2) if "you took the keys by
// force", else (→R3).
import {
  type CardScript,
  flags,
  type GameContext,
  queue,
  endScenario,
} from "../../../../src/engine/api";
import { BY_FORCE } from "../../../campaigns/the-path-to-carcosa/scripts/the-unspeakable-oath";

export default {
  abilities: [{ kind: "revelation", run: "escape" }],
  fns: {
    escape(game: GameContext) {
      queue(game, endScenario({ id: flags.rememberedFact.get(game, BY_FORCE) ? "R2" : "R3" }));
    },
  },
} satisfies CardScript;
