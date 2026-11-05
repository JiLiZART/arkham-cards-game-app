// Rites Howled (Where Doom Awaits) — revelation: the top 3 cards of each investigator's deck discarded (its data), then
// each investigator at an [[Altered]] location shuffles each weakness in their discard pile into their deck
import {
  activeInvs,
  type CardScript,
  def,
  type GameContext,
  inv,
  shuffleIntoDeck,
} from "../../../../src/engine/api";
import { atTrait } from "../../../campaigns/the-dunwich-legacy/scripts/where-doom-awaits";

export default {
  fns: {
    weaknessesBack(game: GameContext) {
      for (const i of activeInvs(game)) {
        if (!atTrait(game, i, "Altered")) continue;
        for (const id of inv(game, i).discard.filter((c) => !!def(game, c).subtype))
          shuffleIntoDeck(game, id, i);
      }
    },
  },
} satisfies CardScript;
