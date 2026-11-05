// Feed the Beast (Blood on the Altar, agenda 3) — back: each investigator must immediately resign
import {
  activeInvs,
  type CardScript,
  type GameContext,
  queue,
  resolveEffect,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    back(game: GameContext) {
      queue(
        game,
        ...activeInvs(game).map((i) =>
          resolveEffect({ effect: { op: "resign" }, ctx: { you: i, source: null } }),
        ),
      );
    },
  },
} satisfies CardScript;
