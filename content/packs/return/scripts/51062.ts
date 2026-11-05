// A Baleful Welcome — Revelation: two of investigate, fight, evade, move and play chosen (three if another copy was drawn
// this phase), one a step; for the rest of the round no investigator can take an action of a chosen kind
import {
  activeInvs,
  addTempMod,
  argField,
  asNumber,
  asStrings,
  card,
  type CardScript,
  currentPhase,
  currentRound,
  flags,
  type GameContext,
  queue,
  runScript,
  type ScriptRun,
} from "../../../../src/engine/api";

const FORBID = {
  investigate: "cannotInvestigate",
  fight: "cannotFight",
  evade: "cannotEvade",
  move: "cannotMoveAction",
  play: "cannotPlayAction",
} as const;
type Action = keyof typeof FORBID;
const ACTIONS = Object.keys(FORBID) as Action[];

const pick = (run: ScriptRun, chosen: string[], n: number) =>
  run.choose<Action>(
    ACTIONS.filter((a) => !chosen.includes(a)).map((a) => ({
      id: a,
      label: a[0].toUpperCase() + a.slice(1),
      value: a,
      key: `option.action.${a}`,
    })),
    {
      text: `Choose an action no investigator can take this round (${chosen.length + 1} of ${n})`,
      key: "balefulWelcome",
    },
    { auto: false },
  );

const next = (game: GameContext, run: ScriptRun, chosen: string[], n: number) =>
  queue(game, runScript({ code: "51062", fn: "another", ctx: run.ctx, args: { chosen, n } }));

export default {
  abilities: [{ kind: "revelation", run: "welcome" }],
  fns: {
    welcome(game: GameContext, run: ScriptRun) {
      const key = `${card(game, run.source).code}:${currentRound(game)}:${currentPhase(game)}`;
      const n = (flags.copiesDrawn.get(game, key) ?? 0) > 0 ? 3 : 2;
      const first = pick(run, [], n);
      flags.copiesDrawn.add(game, key, 1);
      next(game, run, [first], n);
    },
    another(game: GameContext, run: ScriptRun) {
      const chosen = asStrings(argField(run.args, "chosen"));
      const n = asNumber(argField(run.args, "n")) ?? 2;
      if (chosen.length < n) {
        next(game, run, [...chosen, pick(run, chosen, n)], n);
        return;
      }
      for (const a of chosen as Action[])
        for (const i of activeInvs(game))
          addTempMod(game, { flag: FORBID[a] }, i, "round", run.ctx.source ?? null);
    },
  },
} satisfies CardScript;
