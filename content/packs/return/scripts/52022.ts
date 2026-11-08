// Better Never Than Late (Return to The Last King, agenda 1) — back: the set-aside Dianne Devine asset is put into play
// at the location of the Bystander with the fewest clues among those with any (the lead chooses among equals); Shocking
// Display and the encounter discard pile are shuffled into the encounter deck.
import {
  type CardScript,
  def,
  emit,
  EVENT,
  findByCode,
  type GameContext,
  moveCard,
  reshuffleDiscard,
  type ScriptRun,
  setController,
  ZONE,
} from "../../../../src/engine/api";
import { bystanders } from "../../../campaigns/the-path-to-carcosa/scripts/the-last-king";
import { DIANNE_ASSET } from "./52023b";

export const SHOCKING_DISPLAY = "52027";

/** "the [[Bystander]] asset with the fewest clues on it (among [[Bystander]] assets with at least one clue)" */
export function fewestCluesOfAny(game: GameContext) {
  const some = bystanders(game).filter((b) => b.clues > 0);
  const least = Math.min(...some.map((b) => b.clues));
  return some.filter((b) => b.clues === least);
}

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    back(game: GameContext, run: ScriptRun) {
      const dianne = findByCode(game, DIANNE_ASSET, [ZONE.SetAside]);
      const pool = fewestCluesOfAny(game);
      if (dianne && pool.length) {
        const b = run.chooseCard(
          pool.map((x) => x.id),
          { text: "Dianne Devine enters play at which Bystander's location?", key: "dianneSpawn" },
          { who: run.you },
        );
        const at = pool.find((x) => x.id === b)?.location;
        if (at) {
          moveCard(game, dianne.id, ZONE.Attached, { location: at });
          setController(game, dianne.id, null);
          emit(game, EVENT.Place, `${def(game, dianne.id).name} is at ${def(game, at).name}`, {
            card: dianne.id,
          });
        }
      }
      const display = findByCode(game, SHOCKING_DISPLAY, [ZONE.SetAside]);
      if (display) moveCard(game, display.id, ZONE.EncounterDeck);
      reshuffleDiscard(game, "encounter");
      emit(
        game,
        EVENT.Reshuffle,
        "Shocking Display and the encounter discard pile are shuffled into the encounter deck",
      );
    },
  },
} satisfies CardScript;
