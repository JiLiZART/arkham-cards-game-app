// Heroic Rescue — when a non-Elite enemy would attack another investigator at your location: you engage it and its
// attack resolves against you instead; then it takes 1 damage
import {
  cardIf,
  type CardScript,
  def,
  emit,
  EVENT,
  flags,
  type GameContext,
  invName,
  type ScriptRun,
  setEngaged,
  ZONE,
} from "../../../../src/engine/api";

export default {
  abilities: [
    {
      kind: "reaction",
      fromHand: true,
      trigger: "enemyAttacks",
      usableBy: "atLocation",
      label: "Heroic Rescue: take the attack instead",
      condition: {
        all: [{ not: { eventInvestigatorIsYou: true } }, { eventEnemy: { elite: false } }],
      },
      run: "rescue",
    },
  ],
  fns: {
    rescue(game: GameContext, run: ScriptRun) {
      const { enemy, key } = run.ctx;
      if (!enemy || !key || cardIf(game, enemy)?.zone !== ZONE.Enemy) return;
      setEngaged(game, enemy, run.you);
      emit(game, EVENT.Engage, `${invName(game, run.you)} engages ${def(game, enemy).name}`, {
        inv: run.you,
        card: enemy,
      });
      flags.attackRedirect.set(game, key, { to: run.you, damage: 1, source: run.source });
    },
  },
} satisfies CardScript;
