// Corpse Dweller (The Pallid Mask) — spawns at a location with a [[Humanoid]] enemy (its data; with none in play it is
// discarded and its drawer draws again: the scenario's spawnRedirect). Forced: as it spawns, a [[Humanoid]] enemy there
// is discarded (in Return to The Pallid Mask, never The Man in the Pallid Mask: `dwellerPrey`). Hunter, retaliate.
import {
  card,
  type CardScript,
  discard,
  enemies,
  type GameContext,
  type ScriptRun,
} from "../../../../src/engine/api";
import { dwellerPrey } from "../../../campaigns/the-path-to-carcosa/scripts/the-pallid-mask";

export default {
  abilities: [{ kind: "forced", trigger: "enemySpawns", run: "feed" }],
  fns: {
    feed(game: GameContext, run: ScriptRun) {
      const at = card(game, run.source).location;
      const prey = enemies(game).filter(
        (e) => e.id !== run.source && e.location === at && dwellerPrey(game, e.id),
      );
      if (!prey.length) return;
      const pick = run.chooseCard(
        prey.map((e) => e.id),
        { text: "Discard which Humanoid enemy?", key: "tpmCorpseDweller" },
      );
      discard(game, pick);
    },
  },
} satisfies CardScript;
