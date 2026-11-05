// Exhibit Hall: The Archives (Return to The Miskatonic Museum) — two actions: gain 2 clues from the token bank; then the
// Hunting Horror in play strengthens Shadow-spawned by 1 resource, or else it is found and spawns in the Museum Halls,
// and the encounter deck is shuffled
import {
  type CardScript,
  findByCode,
  type GameContext,
  queue,
  resolveEffect,
  runScript,
  type ScriptRun,
  shuffleDeck,
  ZONE,
} from "../../../../src/engine/api";
import { horrorInPlay, spawnHorror } from "../../dwl/scripts/02141";
import { shadowSpawnedGains } from "./51024";

export default {
  abilities: [
    {
      kind: "action",
      actionCost: 2,
      label: "The Archives: gain 2 clues",
      run: "archives",
    },
  ],
  fns: {
    archives(game: GameContext, run: ScriptRun) {
      queue(
        game,
        resolveEffect({
          effect: { op: "gainClues", amount: 2 },
          ctx: { ...run.ctx, you: run.you },
        }),
        runScript({ code: "51022", fn: "hunt", ctx: run.ctx }),
      );
    },
    hunt(game: GameContext) {
      if (horrorInPlay(game)) {
        shadowSpawnedGains(game);
        return;
      }
      const halls = findByCode(game, "02127", [ZONE.Location]);
      if (halls) spawnHorror(game, { at: halls.id });
      shuffleDeck(game, "encounter");
    },
  },
} satisfies CardScript;
