// Delay the Inevitable — attached to an investigator at your location; cancels the damage and horror just dealt to them, and costs 2 resources each mythos phase
import {
  type CardScript,
  discard,
  emit,
  flags,
  type GameContext,
  inv,
  invName,
  invsAt,
  moveCard,
  setController,
  EVENT,
  ZONE,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  abilities: [
    { kind: "onPlay", run: "attach" },
    {
      kind: "reaction",
      trigger: "damageDealt",
      label: "Delay the Inevitable: cancel the damage and horror",
      condition: { eventInvestigatorIsYou: true },
      run: "cancel",
    },
    {
      kind: "forced",
      trigger: "mythosEnds",
      effects: [
        {
          op: "chooseOne",
          options: [
            {
              label: "Spend 2 resources to keep Delay the Inevitable",
              condition: { resources: { min: 2 } },
              effects: [{ op: "payCost", cost: { resources: 2 } }],
            },
            { label: "Discard Delay the Inevitable", effects: [{ op: "discardSelf" }] },
          ],
        },
      ],
    },
  ],
  fns: {
    attach(game: GameContext, run: ScriptRun) {
      const who = run.chooseInvestigator(invsAt(game, inv(game, run.you).location), {
        text: "Delay the Inevitable: choose an investigator",
        key: "cardChooseInvestigator",
        vars: { card: run.ctx.source ?? null },
      });
      moveCard(game, run.source, ZONE.Play);
      setController(game, run.source, who);
      emit(game, EVENT.Play, `Delay the Inevitable is attached to ${invName(game, who)}`, {
        inv: who,
        card: run.source,
      });
    },
    cancel(game: GameContext, run: ScriptRun) {
      if (!run.ctx.key || !run.ctx.dealt) return;
      flags.prevented.set(game, run.ctx.key, [...run.ctx.dealt]);
      discard(game, run.source);
      emit(
        game,
        EVENT.Cancelled,
        `Delay the Inevitable cancels the damage and horror dealt to ${invName(game, run.you)}`,
        {
          inv: run.you,
          card: run.source,
        },
      );
    },
  },
} satisfies CardScript;
