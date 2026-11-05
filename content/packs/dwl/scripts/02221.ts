// Psychopomp's Song — surge, peril; revelation: into any investigator's threat area. Forced, when its bearer would take
// 1 or more damage: it is discarded and they take 2 more damage
import {
  activeInvs,
  type CardScript,
  def,
  emit,
  invName,
  type EffCtx,
  type GameContext,
  moveCard,
  setController,
  EVENT,
  ZONE,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  abilities: [
    { kind: "revelation", run: "sing" },
    {
      kind: "forced",
      trigger: "damageDealt",
      condition: { script: "wouldTakeDamage" },
      // discarded first, so the 2 more damage don't trigger it again
      effects: [{ op: "discardSelf" }, { op: "takeDamage", amount: 2 }],
    },
  ],
  conditions: {
    wouldTakeDamage: (_game: GameContext, ctx: EffCtx) =>
      !!ctx.inv && ctx.inv === ctx.you && (ctx.dealt?.[0] ?? 0) > 0,
  },
  fns: {
    sing(game: GameContext, run: ScriptRun) {
      const who = run.chooseInvestigator([...activeInvs(game)], {
        text: "Choose an investigator to take Psychopomp's Song",
        key: "psychopompsSong",
      });
      moveCard(game, run.source, ZONE.Threat);
      setController(game, run.source, who);
      emit(
        game,
        EVENT.Threat,
        `${def(game, run.source).name} enters ${invName(game, who)}'s threat area`,
        {
          inv: who,
          card: run.source,
        },
      );
    },
  },
} satisfies CardScript;
