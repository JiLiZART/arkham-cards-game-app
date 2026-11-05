// The Fall (Dim Carcosa, the story of Dark Spires): you decide: you can't bring yourself to do it (the card flips back
// and may be flipped again), or you push her: take 2 horror, 2 damage per investigator to Hastur, and the card flips
// back for good. (Pushing is offered first: refusing changes nothing, and a player who always takes the first
// option, the bot, would otherwise flip it forever.)
import {
  type CardScript,
  type GameContext,
  type ScriptRun,
  queue,
  dealDamage,
} from "../../../../src/engine/api";
import { damageHastur, lock } from "../../../campaigns/the-path-to-carcosa/scripts/dim-carcosa";

export default {
  abilities: [{ kind: "revelation", run: "fall" }],
  fns: {
    fall(game: GameContext, run: ScriptRun) {
      const push = run.choose<boolean>(
        [
          {
            id: "push",
            label: "Push her: take 2 horror, 2 damage per investigator to Hastur",
            value: true,
            key: "option.dcaFall.push",
          },
          {
            id: "refuse",
            label: "You cannot bring yourself to do what must be done",
            value: false,
            key: "option.dcaFall.refuse",
          },
        ],
        { text: "The Fall", key: "dcaFall" },
        { auto: false },
      );
      if (!push) return;
      lock(game, run.source);
      queue(
        game,
        dealDamage({ inv: run.you, damage: 0, horror: 2, direct: false, source: run.source }),
        ...damageHastur(game, run.source, 2),
      );
    },
  },
} satisfies CardScript;
