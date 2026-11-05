// Arkham Asylum (The Unspeakable Oath, act 1) — back: the investigators decide how to get the keys from the nurse: an
// investigator tests [combat], [agility] or [intellect] (4), and on a failure they choose an option they have yet to
// choose; or they knock her over and grab the keys ("you took the keys by force"). The act then advances.
import {
  activeInvs,
  asString,
  type CardScript,
  flags,
  type GameContext,
  leadInvestigator,
  type ScriptRun,
  queue,
  resolveEffect,
  runScript,
} from "../../../../src/engine/api";
import { BY_FORCE } from "../../../campaigns/the-path-to-carcosa/scripts/the-unspeakable-oath";

const TESTS = [
  {
    skill: "combat",
    label: "Any investigator tests combat (4) to intimidate her into giving you the keys",
  },
  { skill: "agility", label: "Any investigator tests agility (4) to steal the keys from her" },
  {
    skill: "intellect",
    label: "Any investigator tests intellect (4) to persuade her to give you the keys",
  },
] as const;
const tried = (game: GameContext, skill: string) => !!flags.named(game, `tuoKeysTried:${skill}`);

export default {
  abilities: [{ kind: "revelation", run: "keys" }],
  fns: {
    keys(game: GameContext, run: ScriptRun) {
      const how = run.choose<string>(
        [
          ...TESTS.filter((t) => !tried(game, t.skill)).map((t) => ({
            id: t.skill,
            label: t.label,
            value: t.skill,
            key: `option.tuoKeys.${t.skill}`,
          })),
          {
            id: "force",
            label: "You knock her over and grab the keys",
            value: "force",
            key: "option.tuoKeys.force",
          },
        ],
        { text: "The investigators must decide", key: "tuoKeys" },
        { auto: false, who: leadInvestigator(game) },
      );
      if (how === "force") {
        flags.rememberedFact.set(game, BY_FORCE, true);
        return;
      }
      flags.setNamed(game, `tuoKeysTried:${how}`, true);
      queue(game, runScript({ code: "03163", fn: "keysTest", ctx: run.ctx, args: how }));
    },
    /** the lead names who tests; a failure asks again among the options left */
    keysTest(game: GameContext, run: ScriptRun) {
      const skill = asString(run.args) as (typeof TESTS)[number]["skill"];
      const who = run.chooseInvestigator(
        activeInvs(game),
        { text: "Choose an investigator to test", key: "tuoKeysTester" },
        { who: leadInvestigator(game) },
      );
      queue(
        game,
        resolveEffect({
          effect: {
            op: "skillTest",
            skill,
            difficulty: 4,
            onFail: [{ op: "script", fn: "keys" }],
          },
          ctx: { ...run.ctx, you: who },
        }),
      );
    },
  },
} satisfies CardScript;
