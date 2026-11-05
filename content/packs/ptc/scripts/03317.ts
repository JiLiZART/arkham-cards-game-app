// Madness Coils (Dim Carcosa, agenda 1): Hastur cannot be defeated (the scenario's would-be-defeated hook); with 3
// damage per investigator on him it advances (the scenario's thresholds). On the first turn, with Doubt and Conviction
// tied, the lead chooses act 2's version. Back (Key to the...?): the investigators choose an option they have yet to
// choose; a failed test chooses again.
import {
  activeInvs,
  type CardScript,
  deckCards,
  type EffCtx,
  flags,
  type GameContext,
  leadInvestigator,
  type ScriptRun,
  addCounter,
  queue,
  dealDamage,
  resolveEffect,
  runScript,
} from "../../../../src/engine/api";
import { ACT2_CHOICE } from "../../../campaigns/the-path-to-carcosa/scripts/dim-carcosa";

const CODE = "03317";
const OPTIONS = ["willpower", "intellect", "horror", "faint"] as const;
type Option = (typeof OPTIONS)[number];
const chosen = (o: Option) => `dcaKey:${o}`;
const LABELS: Record<Option, string> = {
  willpower: "Any investigator tests [willpower] (4) to snap out of it",
  intellect: "Any investigator tests [intellect] (4) to remember that you've done this before",
  horror: "This can't be real: each investigator takes 2 horror",
  faint: "The investigators faint: 1 doom on agenda 2a",
};

export default {
  abilities: [
    { kind: "forced", trigger: "turnBegins", condition: { script: "act2Pending" }, run: "act2" },
    { kind: "revelation", run: "keyTo" },
  ],
  conditions: {
    act2Pending: (game: GameContext, ctx: EffCtx) =>
      !!ctx.inv && !!flags.rememberedFact.get(game, ACT2_CHOICE),
  },
  fns: {
    act2(game: GameContext, run: ScriptRun) {
      queue(
        game,
        runScript({
          code: "dim-carcosa",
          fn: "chooseAct2",
          ctx: { ...run.ctx, you: leadInvestigator(game) },
        }),
      );
    },
    /** "The investigators must decide (choose one)": among the options not chosen yet */
    keyTo(game: GameContext, run: ScriptRun) {
      const open = OPTIONS.filter((o) => !flags.rememberedFact.get(game, chosen(o)));
      const pick = run.choose<Option>(
        open.map((o) => ({ id: o, label: LABELS[o], value: o, key: `option.dcaKey.${o}` })),
        { text: "Key to the...?: the investigators must decide", key: "dcaKeyTo" },
        { auto: false, who: leadInvestigator(game) },
      );
      flags.rememberedFact.set(game, chosen(pick), true);
      if (pick === "horror")
        queue(
          game,
          ...activeInvs(game).map((i) =>
            dealDamage({ inv: i, damage: 0, horror: 2, direct: false, source: run.source }),
          ),
        );
      else if (pick === "faint") {
        // "Advance to agenda 2a and place 1 doom on it": it waits on top of the agenda deck
        const next = deckCards(game, "agenda")[0];
        if (next) addCounter(game, next, "doom", 1);
      } else queue(game, runScript({ code: CODE, fn: "tester", ctx: run.ctx, args: pick }));
    },
    /** "Any investigator tests …": the lead names who; a failure decides again */
    tester(game: GameContext, run: ScriptRun) {
      const skill = run.args === "intellect" ? "intellect" : "willpower";
      const who = run.chooseInvestigator(
        activeInvs(game),
        {
          text: `Who tests ${skill} (4)?`,
          key: "dcaKeyTester",
        },
        { who: leadInvestigator(game) },
      );
      queue(
        game,
        resolveEffect({
          effect: {
            op: "skillTest",
            skill,
            difficulty: 4,
            onFail: [{ op: "script", fn: "keyTo" }],
          },
          ctx: { ...run.ctx, you: who },
        }),
      );
    },
  },
} satisfies CardScript;
