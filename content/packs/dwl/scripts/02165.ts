// Run! (The Essex County Express, act 1) — objective: an investigator enters the Engine Car (the scenario's
// checkObjectives); back: that investigator chooses to dodge the creature of steam (agility 3; failing, 1 mental trauma)
// or to endure its heat (combat 3; failing, 1 physical trauma)
import {
  addCounter,
  type CardScript,
  type GameContext,
  inv,
  type ScriptRun,
  turnOrder,
  queue,
  resolveEffect,
  runScript,
} from "../../../../src/engine/api";
import { engineCar } from "../../../campaigns/the-dunwich-legacy/scripts/essex-county-express";

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    back(game: GameContext, run: ScriptRun) {
      const engine = engineCar(game)?.id;
      const there = turnOrder(game).filter((i) => engine && inv(game, i).location === engine);
      const who = run.chooseInvestigator(there.length ? there : [run.you], {
        text: "Choose the investigator who entered the Engine Car",
        key: "wingsOfSteamWho",
      });
      queue(game, runScript({ code: "02165", fn: "decide", ctx: { ...run.ctx, you: who } }));
    },
    decide(game: GameContext, run: ScriptRun) {
      const skill = run.choose<"agility" | "combat">(
        [
          {
            id: "agility",
            label: "Test agility (3) to dodge the creature",
            value: "agility",
            key: "option.dodgeSteam",
          },
          {
            id: "combat",
            label: "Test combat (3) to endure its heat",
            value: "combat",
            key: "option.endureSteam",
          },
        ],
        { text: "A winged creature of steam swoops down", key: "wingsOfSteam" },
        { auto: false },
      );
      queue(
        game,
        resolveEffect({
          effect: {
            op: "skillTest",
            skill,
            difficulty: 3,
            onFail: [{ op: "script", fn: skill === "agility" ? "mentalTrauma" : "physicalTrauma" }],
          },
          ctx: { ...run.ctx, you: run.you },
        }),
      );
    },
    mentalTrauma(game: GameContext, run: ScriptRun) {
      addCounter(game, run.you, "mentalTrauma", 1);
    },
    physicalTrauma(game: GameContext, run: ScriptRun) {
      addCounter(game, run.you, "physicalTrauma", 1);
    },
  },
} satisfies CardScript;
