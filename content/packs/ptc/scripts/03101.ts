// Ooze and Filth — next to the act deck until the end of the round: each location gets +1 shroud.
import {
  type CardScript,
  type GameContext,
  type InstId,
  locations,
  type ScriptRun,
  card,
  ZONE,
} from "../../../../src/engine/api";
import { besideTheDecks } from "./03083";

export default {
  abilities: [
    { kind: "revelation", run: "place" },
    { kind: "forced", trigger: "roundEnds", effects: [{ op: "discardSelf" }] },
  ],
  modifiers(game: GameContext, cardId: InstId) {
    if (card(game, cardId).zone !== ZONE.Play) return [];
    return locations(game).map((l) => ({
      target: l.id,
      mod: { stat: "shroud" as const, value: 1 },
    }));
  },
  fns: {
    place(game: GameContext, run: ScriptRun) {
      besideTheDecks(game, run.source);
    },
  },
} satisfies CardScript;
