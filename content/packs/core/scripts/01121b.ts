// The Masked Hunter — while engaged with it you cannot discover or spend clues
import { card, type CardScript, type GameContext, type InstId } from "../../../../src/engine/api";

export default {
  modifiers(game: GameContext, id: InstId) {
    const c = card(game, id);
    if (c.zone !== "enemy" || !c.engagedWith) return [];
    return [
      { target: c.engagedWith, mod: { flag: "cannotDiscoverClues" as const } },
      { target: c.engagedWith, mod: { flag: "cannotSpendClues" as const } },
    ];
  },
} satisfies CardScript;
