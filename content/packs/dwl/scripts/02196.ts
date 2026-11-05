// Strange Disappearances (Blood on the Altar, agenda 1) — back: if there are 3 or more potential sacrifices, one of them
// at random goes underneath the agenda deck, unseen
import {
  type CardScript,
  type GameContext,
  type ScriptRun,
  sideDeck,
} from "../../../../src/engine/api";
import {
  sacrifice,
  SACRIFICES,
} from "../../../campaigns/the-dunwich-legacy/scripts/blood-on-the-altar";

/** the agenda's back: a sacrifice at random while the pile holds at least `min` */
export const sacrificeIfAtLeast = (min: number) => (game: GameContext, run: ScriptRun) => {
  if (sideDeck(game, SACRIFICES).length >= min) sacrifice(game, run.source);
};

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: { back: sacrificeIfAtLeast(3) },
} satisfies CardScript;
