// Stage of the Ward Theatre (Return to Dim Carcosa): you cannot attack Hastur while you are there. While Hastur moves,
// his location is connected to it if an investigator is there (the scenario's `connections` hook). Its story is The
// Delusion (52063b).
import { type CardScript, type GameContext, type InstId, invsAt } from "../../../../src/engine/api";
import { HASTURS } from "../../../campaigns/the-path-to-carcosa/scripts/dim-carcosa";

export default {
  modifiers: (game: GameContext, self: InstId) =>
    invsAt(game, self).map((i) => ({
      target: i,
      mod: { flag: "cannotAttack" as const, filter: { code: Object.keys(HASTURS) } },
    })),
} satisfies CardScript;
