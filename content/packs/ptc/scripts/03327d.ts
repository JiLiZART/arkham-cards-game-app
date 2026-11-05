// A Moment's Rest (Dim Carcosa, the story of Ruins of Carcosa): you choose: an enemy in play exhausted and disengaged
// from all investigators, or you heal 5 horror; then another set-aside copy of Ruins of Carcosa takes this one's place.
import {
  type CardScript,
  enemies,
  type GameContext,
  type ScriptRun,
  queue,
  resolveEffect,
  runScript,
} from "../../../../src/engine/api";
import { stun } from "../../../campaigns/the-path-to-carcosa/scripts/dim-carcosa";

export default {
  abilities: [{ kind: "revelation", run: "rest" }],
  fns: {
    rest(game: GameContext, run: ScriptRun) {
      const exhaust =
        enemies(game).length > 0 &&
        run.choose<boolean>(
          [
            {
              id: "exhaust",
              label: "Exhaust an enemy and disengage it",
              value: true,
              key: "option.dcaMomentsRest.exhaust",
            },
            { id: "heal", label: "Heal 5 horror", value: false, key: "option.dcaMomentsRest.heal" },
          ],
          { text: "A Moment's Rest", key: "dcaMomentsRest" },
          { auto: false },
        );
      queue(
        game,
        exhaust
          ? runScript({ code: "03327d", fn: "exhaustOne", ctx: run.ctx })
          : resolveEffect({ effect: { op: "heal", horror: 5 }, ctx: run.ctx }),
        runScript({ code: "dim-carcosa", fn: "replace", ctx: run.ctx }),
      );
    },
    exhaustOne(game: GameContext, run: ScriptRun) {
      const them = enemies(game);
      if (!them.length) return;
      const pick = run.chooseCard(
        them.map((e) => e.id),
        { text: "Exhaust and disengage which enemy?", key: "dcaMomentsRestEnemy" },
      );
      stun(game, pick);
    },
  },
} satisfies CardScript;
