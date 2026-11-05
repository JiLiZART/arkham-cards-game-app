// Museum Entrance — what it gains while the Museum Halls are locked (02127's unrevealed side): test [combat] (5) to break
// down the door; a success advances act 1 at once, through its "Breaking and Entering" side. Its own text (no resources
// gained here, resign) is data
import {
  card,
  type CardScript,
  cardIf,
  currentAct,
  findByCode,
  flags,
  type GameContext,
  ZONE,
  queue,
  advanceAct,
} from "../../../../src/engine/api";
import { BROKE_IN } from "./02122";

const hallsLocked = (game: GameContext) => {
  const halls = findByCode(game, "02127", [ZONE.Location]);
  return !!halls && !card(game, halls.id).revealed;
};

export default {
  abilities: [
    {
      kind: "action",
      label: "Museum Entrance: test combat (5) to break down the door",
      usableBy: "atLocation",
      condition: { script: "locked" },
      effects: [
        {
          op: "skillTest",
          skill: "combat",
          difficulty: 5,
          onSuccess: [{ op: "script", fn: "breakIn" }],
        },
      ],
    },
  ],
  conditions: {
    locked: (game: GameContext) =>
      hallsLocked(game) && cardIf(game, currentAct(game))?.code === "02122",
  },
  fns: {
    breakIn(game: GameContext) {
      if (cardIf(game, currentAct(game))?.code !== "02122") return;
      flags.setNamed(game, BROKE_IN, true);
      queue(game, advanceAct());
    },
  },
} satisfies CardScript;
