// The Red-Gloved Man — as he enters play two of your skills are chosen: their base values are 6 while he stays in play
// (he is discarded at the end of the mythos phase, in cards.json). Printed as a reaction: it resolves as he enters play,
// since choosing is never worse than not.
import {
  asString,
  type CardScript,
  flags,
  type GameContext,
  queue,
  runScript,
  type ScriptRun,
} from "../../../../src/engine/api";

type Skill = "willpower" | "intellect" | "combat" | "agility";
const SKILLS: Skill[] = ["willpower", "intellect", "combat", "agility"];

const ask = (run: ScriptRun, left: Skill[]) =>
  run.choose<Skill>(
    left.map((s) => ({ id: s, label: s, value: s, key: `stat.${s}` })),
    { text: "The Red-Gloved Man: choose a skill to raise to 6", key: "raiseBaseSkill" },
    { auto: false },
  );

const raise = (game: GameContext, card: string, skills: Skill[]) =>
  flags.baseRaised.set(game, { ...flags.baseRaised.get(game), [card]: { skills, to: 6 } });

export default {
  fns: {
    raise(game: GameContext, run: ScriptRun) {
      const first = ask(run, SKILLS);
      raise(game, run.source, [first]);
      // one choice a step: the second skill is its own
      queue(game, runScript({ code: "02310", fn: "second", ctx: run.ctx, args: first }));
    },
    second(game: GameContext, run: ScriptRun) {
      const first = asString(run.args) as Skill;
      raise(game, run.source, [
        first,
        ask(
          run,
          SKILLS.filter((s) => s !== first),
        ),
      ]);
    },
  },
} satisfies CardScript;
