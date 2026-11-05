// Empire of the Undead (The Pallid Mask, agenda 2): each location is connected to each adjacent one. Back (Join Them In
// Death): each investigator is defeated and suffers 1 physical trauma (a defeat by damage).
import {
  type CardScript,
  type GameContext,
  inv,
  turnOrder,
  queue,
  defeatInvestigator,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "joinThem" }],
  fns: {
    joinThem(game: GameContext) {
      queue(
        game,
        ...turnOrder(game)
          .filter((i) => inv(game, i).status === "playing")
          .map((i) => defeatInvestigator({ inv: i, by: "damage" })),
      );
    },
  },
} satisfies CardScript;
