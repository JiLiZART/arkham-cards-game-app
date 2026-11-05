// Stars of Aldebaran (Dim Carcosa, the story of Bleak Plains): each investigator heals 3 horror; 4 damage to an enemy
// in play other than Hastur; then another set-aside copy of Bleak Plains takes this one's place, with its clues.
import {
  type CardScript,
  enemies,
  type GameContext,
  type ScriptRun,
  queue,
  damageEnemy,
  resolveEffect,
  runScript,
} from "../../../../src/engine/api";
import { HASTURS } from "../../../campaigns/the-path-to-carcosa/scripts/dim-carcosa";

/** "Each investigator heals N horror", then the location replaced */
export const healAndReplace = (n: number): CardScript => ({
  abilities: [{ kind: "revelation", run: "story" }],
  fns: {
    story(game: GameContext, run: ScriptRun) {
      queue(
        game,
        resolveEffect({ effect: { op: "heal", horror: n, target: "each" }, ctx: run.ctx }),
        runScript({ code: "dim-carcosa", fn: "replace", ctx: run.ctx }),
      );
    },
  },
});

export default {
  abilities: [{ kind: "revelation", run: "stars" }],
  fns: {
    stars(game: GameContext, run: ScriptRun) {
      queue(
        game,
        resolveEffect({ effect: { op: "heal", horror: 3, target: "each" }, ctx: run.ctx }),
        runScript({ code: "03326b", fn: "deal", ctx: run.ctx }),
        runScript({ code: "dim-carcosa", fn: "replace", ctx: run.ctx }),
      );
    },
    deal(game: GameContext, run: ScriptRun) {
      const them = enemies(game).filter((e) => !(e.code in HASTURS));
      if (!them.length) return;
      const pick = run.chooseCard(
        them.map((e) => e.id),
        { text: "Deal 4 damage to which enemy?", key: "dcaStarsOfAldebaran" },
      );
      queue(game, damageEnemy({ enemy: pick, amount: 4, by: run.you, source: run.source }));
    },
  },
} satisfies CardScript;
