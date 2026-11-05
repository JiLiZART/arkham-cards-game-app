// Brood of Yog-Sothoth (Amorphous Terror, Return to Undimensioned and Unseen) — Massive, Retaliate, +1 health per
// investigator and only the Esoteric Formula attacks it, in cards.json; forced after it enters your location, or you
// enter its location: test willpower (3), and take 1 horror if you fail
import {
  card,
  type CardScript,
  type GameContext,
  type InvId,
  invsAt,
  queue,
  resolveEffect,
  type ScriptRun,
} from "../../../../src/engine/api";
import { SHARED } from "../../../campaigns/the-dunwich-legacy/scripts/undimensioned-and-unseen";

const terrify = (source: string, i: InvId) =>
  resolveEffect({
    effect: {
      op: "skillTest",
      skill: "willpower",
      difficulty: 3,
      onFail: [{ op: "takeHorror", amount: 1 }],
    },
    ctx: { you: i, inv: i, source },
  });

export default {
  fns: {
    ...SHARED.fns,
    /** it entered a location: each investigator there */
    terrorEnters(game: GameContext, run: ScriptRun) {
      const loc = card(game, run.source).location;
      if (run.ctx.enemy !== run.source || !loc) return;
      const here = invsAt(game, loc);
      if (here.length) queue(game, ...here.map((i) => terrify(run.source, i)));
    },
    /** an investigator entered its location */
    terrorMet(game: GameContext, run: ScriptRun) {
      if (run.ctx.inv) queue(game, terrify(run.source, run.ctx.inv));
    },
  },
} satisfies CardScript;
