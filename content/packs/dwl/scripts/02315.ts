// The End of All Things (Lost in Time and Space, agenda 4) — its forced horror is the scenario's `encounterMove`, its
// "if Yog-Sothoth is defeated, (→R3)" the scenario's checkObjectives. At its doom threshold its back resolves and the
// agenda flips back to its "a" side: Yog-Sothoth attacks each investigator in player order, wherever it is, and the
// doom that made it advance is gone.
import {
  allCards,
  type CardScript,
  emit,
  EVENT,
  type GameContext,
  queue,
  setCounter,
} from "../../../../src/engine/api";
import {
  SHARED,
  yogAttacksEach,
} from "../../../campaigns/the-dunwich-legacy/scripts/lost-in-time-and-space";

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  hooks: {
    doomThreshold(game: GameContext) {
      for (const c of allCards(game)) if (c.doom) setCounter(game, c.id, "doom", 0);
      emit(game, EVENT.Doom, "Yog-Sothoth Attacks! All doom in play is removed");
      queue(game, ...yogAttacksEach(game));
      return true;
    },
  },
  fns: {
    ...SHARED.fns,
    back(game: GameContext) {
      queue(game, ...yogAttacksEach(game));
    },
  },
} satisfies CardScript;
