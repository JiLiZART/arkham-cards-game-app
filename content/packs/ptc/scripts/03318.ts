// Madness Drowns (Dim Carcosa, agenda 2): Hastur gets +1 fight and cannot be defeated (the scenario's hook); with 5
// damage per investigator on him it advances (the scenario's thresholds). Back (The Final Guest...?): Beast of
// Aldebaran spawns at the Palace of the King; the encounter discard pile is shuffled into the encounter deck.
import {
  type CardScript,
  emit,
  findByCode,
  type GameContext,
  type InstId,
  reshuffleDiscard,
  EVENT,
  ZONE,
  queue,
  spawn,
} from "../../../../src/engine/api";
import { BEAST, hastur, PALACE } from "../../../campaigns/the-path-to-carcosa/scripts/dim-carcosa";

/** "Hastur gets +N fight" while this agenda is current */
export const hasturFight = (n: number) => (game: GameContext, _self: InstId) => {
  const h = hastur(game);
  return h ? [{ target: h.id, mod: { stat: "fight" as const, value: n } }] : [];
};

export default {
  abilities: [{ kind: "revelation", run: "finalGuest" }],
  modifiers: hasturFight(1),
  fns: {
    finalGuest(game: GameContext) {
      reshuffleDiscard(game, "encounter");
      emit(game, EVENT.Reshuffle, "The encounter discard pile is shuffled into the encounter deck");
      const beast = findByCode(game, BEAST, [ZONE.SetAside]);
      const palace = findByCode(game, PALACE, [ZONE.Location]);
      if (beast && palace) queue(game, spawn({ enemy: beast.id, inv: null, at: palace.id }));
    },
  },
} satisfies CardScript;
