// Dimensional Doorway (Lost in Time and Space) — its abilities are in cards.json; revelation: into play, then the topmost
// [[Hex]] card of the encounter discard pile drawn and resolved
import {
  type CardScript,
  def,
  type GameContext,
  pile,
  queue,
  resolveRevelation,
  type ScriptRun,
  ZONE,
} from "../../../../src/engine/api";
import { SHARED } from "../../../campaigns/the-dunwich-legacy/scripts/lost-in-time-and-space";

export default {
  fns: {
    ...SHARED.fns,
    doorwayHex(game: GameContext, run: ScriptRun) {
      // the discard pile's last card is its top
      const top = [...pile(game, ZONE.EncounterDiscard)]
        .reverse()
        .find((id) => def(game, id).traits.includes("Hex") && def(game, id).type === "treachery");
      if (top) queue(game, resolveRevelation({ inv: run.you, card: top }));
    },
  },
} satisfies CardScript;
