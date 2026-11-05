// Survival Instinct (2) — a successful evasion: the evading investigator may evade each other enemy engaged with them,
// then may move to a connecting location. Resolved once the test is over, after the tested enemy is evaded, so "each
// other enemy" is each one still engaged.
import {
  afterTest,
  type CardScript,
  connections,
  enemies,
  type GameContext,
  inv,
  queue,
  resolveEffect,
  runScript,
  type ScriptRun,
} from "../../../../src/engine/api";

const yesNo = (yes: string) => [
  { id: "yes", label: "Yes", value: true, key: yes },
  { id: "no", label: "No", value: false, key: "option.no" },
];

export default {
  abilities: [
    {
      kind: "onPlay",
      condition: { all: [{ succeededBy: { min: 0 } }, { testKind: "evade" }] },
      run: "instinct",
    },
  ],
  fns: {
    instinct(game: GameContext, run: ScriptRun) {
      const ctx = { ...run.ctx, you: run.ctx.inv ?? run.you };
      afterTest(
        game,
        runScript({ code: "02235", fn: "evadeOthers", ctx }),
        runScript({ code: "02235", fn: "move", ctx }),
      );
    },
    evadeOthers(game: GameContext, run: ScriptRun) {
      if (!enemies(game).some((e) => e.engagedWith === run.you)) return;
      const yes = run.choose<boolean>(
        yesNo("option.evadeOthers"),
        {
          text: "Survival Instinct: evade each other enemy engaged with you?",
          key: "survivalInstinct",
        },
        { auto: false },
      );
      if (yes)
        queue(game, resolveEffect({ effect: { op: "evade", all: "engaged" }, ctx: run.ctx }));
    },
    move(game: GameContext, run: ScriptRun) {
      const loc = inv(game, run.you).location;
      if (!loc || !connections(game, loc).length) return;
      const yes = run.choose<boolean>(
        yesNo("option.moveConnecting"),
        { text: "Survival Instinct: move to a connecting location?", key: "survivalInstinctMove" },
        { auto: false },
      );
      if (yes)
        queue(game, resolveEffect({ effect: { op: "moveTo", where: "connecting" }, ctx: run.ctx }));
    },
  },
} satisfies CardScript;
