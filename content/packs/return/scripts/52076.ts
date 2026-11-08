// Voice of Tru'nembra — Peril. Revelation: test [willpower] (3). For each point you fail by, you must choose a
// different option: lose 2 resources; take 1 horror; get -2 to the next skill test you perform this round.
import {
  afterTest,
  argField,
  asNumber,
  asStrings,
  type CardScript,
  type GameContext,
  queue,
  resolveEffects,
  runScript,
  type ScriptRun,
} from "../../../../src/engine/api";

const VOICE = "52076";
type Effects = Parameters<typeof resolveEffects>[0]["effects"];
const OPTIONS: { id: string; label: string; effects: Effects }[] = [
  { id: "resources", label: "Lose 2 resources", effects: [{ op: "loseResources", amount: 2 }] },
  { id: "horror", label: "Take 1 horror", effects: [{ op: "takeHorror", amount: 1 }] },
  {
    id: "test",
    label: "Get -2 to the next skill test you perform this round",
    effects: [
      { op: "modify", mod: { stat: "testValue", value: -2 }, until: "round", next: "test" },
    ],
  },
];

export default {
  abilities: [
    {
      kind: "revelation",
      effects: [
        {
          op: "skillTest",
          skill: "willpower",
          difficulty: 3,
          onFail: [{ op: "script", fn: "failed" }],
        },
      ],
    },
  ],
  fns: {
    /** the choices come once the test is over: the next test is a later one */
    failed(game: GameContext, run: ScriptRun) {
      const left = Math.min(OPTIONS.length, run.ctx.failBy ?? 0);
      if (left > 0)
        afterTest(
          game,
          runScript({ code: VOICE, fn: "choose", ctx: run.ctx, args: { left, used: [] } }),
        );
    },
    choose(game: GameContext, run: ScriptRun) {
      const left = asNumber(argField(run.args, "left")) ?? 0;
      const used = asStrings(argField(run.args, "used"));
      const open = OPTIONS.filter((o) => !used.includes(o.id));
      if (left <= 0 || !open.length) return;
      const id = run.choose<string>(
        open.map((o) => ({
          id: o.id,
          label: o.label,
          value: o.id,
          key: `option.voiceOfTrunembra.${o.id}`,
        })),
        { text: "Voice of Tru'nembra: choose a different option", key: "voiceOfTrunembra" },
      );
      const effects = OPTIONS.find((o) => o.id === id)!.effects;
      queue(
        game,
        resolveEffects({ effects, ctx: run.ctx }),
        runScript({
          code: VOICE,
          fn: "choose",
          ctx: run.ctx,
          args: { left: left - 1, used: [...used, id] },
        }),
      );
    },
  },
} satisfies CardScript;
