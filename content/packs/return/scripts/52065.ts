// Delusory Evils — Peril, Hidden. Revelation: secretly add it to your hand, or place 1 doom on the current agenda (it
// may advance) and discard it. Forced, when you would succeed at a skill test by 3 or more: you fail instead, and it
// is discarded from your hand.
import {
  type CardScript,
  type GameContext,
  hideInHand,
  queue,
  resolveEffects,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  abilities: [
    { kind: "revelation", run: "delude" },
    {
      kind: "forced",
      trigger: "wouldSucceedSkillTest",
      condition: { all: [{ yourSkillTest: true }, { succeededBy: { min: 3 } }] },
      effects: [{ op: "forceResult", result: "fail" }, { op: "discardSelf" }],
    },
  ],
  fns: {
    delude(game: GameContext, run: ScriptRun) {
      const pick = run.choose<"hide" | "doom">(
        [
          {
            id: "hide",
            label: "Secretly add Delusory Evils to your hand",
            value: "hide",
            key: "option.delusoryEvilsHide",
          },
          {
            id: "doom",
            label: "Place 1 doom on the current agenda and discard it",
            value: "doom",
            key: "option.delusoryEvilsDoom",
          },
        ],
        { text: "Delusory Evils: choose one", key: "delusoryEvils" },
      );
      if (pick === "hide") {
        hideInHand(game, run.source, run.you);
        return;
      }
      queue(
        game,
        resolveEffects({
          effects: [{ op: "placeDoom", amount: 1, on: "agenda" }, { op: "checkDoom" }],
          ctx: run.ctx,
        }),
      );
    },
  },
} satisfies CardScript;
