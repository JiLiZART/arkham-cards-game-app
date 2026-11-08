// Radical Treatment (Return to The Unspeakable Oath; attached to Daniel Chesterfield by act 2 v. IV's back) — Forced: at
// the end of the round, Daniel's controller takes 2 horror. [action] (any investigator at the Infirmary): test
// [willpower] or [intellect] (6), 3 with the Clasp of Black Onyx; a success detaches it into the victory display.
import {
  attachTo,
  card,
  type CardScript,
  controlled,
  dealDamage,
  def,
  emit,
  type EffCtx,
  EVENT,
  type GameContext,
  inv,
  moveCard,
  queue,
  resolveEffect,
  type ScriptRun,
  ZONE,
} from "../../../../src/engine/api";

const CLASP = "03142";
const INFIRMARY = "Infirmary";

export default {
  abilities: [
    { kind: "forced", trigger: "roundEnds", run: "treatment" },
    {
      kind: "action",
      usableBy: "anyone",
      label: "Radical Treatment: test willpower or intellect (6) to detach it",
      condition: { script: "atInfirmary" },
      run: "cure",
    },
  ],
  conditions: {
    atInfirmary: (game: GameContext, ctx: EffCtx) => {
      const at = ctx.you ? inv(game, ctx.you).location : null;
      return !!at && def(game, at).name === INFIRMARY;
    },
  },
  fns: {
    treatment(game: GameContext, run: ScriptRun) {
      const daniel = card(game, run.source).attachedTo;
      const who = daniel ? card(game, daniel).controller : null;
      if (who)
        queue(
          game,
          dealDamage({ inv: who, damage: 0, horror: 2, direct: false, source: run.source }),
        );
    },
    cure(game: GameContext, run: ScriptRun) {
      const skill = run.choose<"willpower" | "intellect">(
        [
          {
            id: "willpower",
            label: "Test willpower",
            value: "willpower",
            key: "option.testWillpower",
          },
          {
            id: "intellect",
            label: "Test intellect",
            value: "intellect",
            key: "option.testIntellect",
          },
        ],
        { text: "Radical Treatment: test which skill?", key: "radicalTreatment" },
      );
      const clasp = controlled(game, run.you).some((c) => c.code === CLASP);
      queue(
        game,
        resolveEffect({
          effect: {
            op: "skillTest",
            skill,
            difficulty: clasp ? 3 : 6,
            onSuccess: [{ op: "script", fn: "cured" }],
          },
          ctx: run.ctx,
        }),
      );
    },
    cured(game: GameContext, run: ScriptRun) {
      if (card(game, run.source).zone !== ZONE.Attached) return;
      attachTo(game, run.source, null);
      moveCard(game, run.source, ZONE.Victory);
      emit(game, EVENT.Victory, "Radical Treatment is added to the victory display", {
        card: run.source,
      });
    },
  },
} satisfies CardScript;
