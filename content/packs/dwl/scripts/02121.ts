// In Every Shadow (The Miskatonic Museum, agenda 3) — Shadow-spawned on the Horror as it enters play; back: each
// investigator who has not resigned is defeated and suffers 1 physical trauma (no resolution follows)
import {
  type CardScript,
  type GameContext,
  inv,
  turnOrder,
  queue,
  defeatInvestigator,
} from "../../../../src/engine/api";
import { empower, horrorEntersPlay } from "./02119";

export default {
  abilities: [horrorEntersPlay, { kind: "revelation", run: "back" }],
  fns: {
    empower,
    back(game: GameContext) {
      // defeated by the card, with the physical trauma a defeat by damage brings
      for (const i of turnOrder(game))
        if (inv(game, i).status === "playing")
          queue(game, defeatInvestigator({ inv: i, by: "damage" }));
    },
  },
} satisfies CardScript;
