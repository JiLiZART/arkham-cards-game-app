// Ruin and Destruction — with no investigator at a Brood of Yog-Sothoth's location it gains surge; else each investigator
// at one tests agility (3), taking 1 damage per point failed
import {
  card,
  type CardScript,
  flags,
  type GameContext,
  invsAt,
  queue,
  resolveEffect,
  type ScriptRun,
} from "../../../../src/engine/api";
import { broods } from "../../../campaigns/the-dunwich-legacy/scripts/undimensioned-and-unseen";

export default {
  abilities: [{ kind: "revelation", run: "ruin" }],
  fns: {
    ruin(game: GameContext, run: ScriptRun) {
      const places = new Set(broods(game).map((id) => card(game, id).location));
      const hit = [...places].flatMap((l) => invsAt(game, l));
      if (!hit.length) {
        flags.surge.set(game, run.source, true);
        return;
      }
      queue(
        game,
        ...hit.map((i) =>
          resolveEffect({
            effect: {
              op: "skillTest",
              skill: "agility",
              difficulty: 3,
              onFail: [{ op: "takeDamage", amount: "failBy" }],
            },
            ctx: { you: i, inv: i, source: run.source },
          }),
        ),
      );
    },
  },
} satisfies CardScript;
