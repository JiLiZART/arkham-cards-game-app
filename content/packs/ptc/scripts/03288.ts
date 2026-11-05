// North Tower (Black Stars Rise, version II) — while the current "a" agenda has more doom than the current "c" agenda,
// each skill test at North Tower is 1 easier.
import { type CardScript, type GameContext, type InstId, invsAt } from "../../../../src/engine/api";
import { agendaOf, doomOf } from "../../../campaigns/the-path-to-carcosa/scripts/black-stars-rise";

export default {
  modifiers(game: GameContext, self: InstId) {
    if (!agendaOf(game, "a") || !agendaOf(game, "c") || doomOf(game, "a") <= doomOf(game, "c"))
      return [];
    return invsAt(game, self).map((i) => ({
      target: i,
      mod: { stat: "difficulty" as const, value: -1 },
    }));
  },
} satisfies CardScript;
