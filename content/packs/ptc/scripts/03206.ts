// Pursuing Shadows (A Phantom of Truth, act 2 v. I): after an investigator successfully attacks The Organist, an
// investigator at their location may place 1 of their clues on him (group limit 1 per investigator per round); with 3
// per investigator on him the act advances (the scenario's objective check). Back (Lost Lamb): Resolution 2 if you
// intruded on a secret meeting, else 1.
import {
  activeInvs,
  addCounter,
  type CardScript,
  currentRound,
  currentTest,
  type EffCtx,
  emit,
  flags,
  type GameContext,
  inv,
  invName,
  playerCount,
  type ScriptRun,
  EVENT,
  queue,
  checkObjectives,
} from "../../../../src/engine/api";
import {
  lostLamb,
  organist,
} from "../../../campaigns/the-path-to-carcosa/scripts/a-phantom-of-truth";

const usedThisRound = (game: GameContext) => {
  let n = 0;
  while (flags.rememberedFact.get(game, `apotOrganistClue:${currentRound(game)}:${n}`)) n++;
  return n;
};

export default {
  abilities: [
    {
      kind: "reaction",
      trigger: "successfulAttack",
      usableBy: "anyone",
      label: "Pursuing Shadows: place 1 of your clues on The Organist",
      condition: { script: "attackedHim" },
      run: "clueOnHim",
    },
    { kind: "revelation", run: "lostLamb" },
  ],
  conditions: {
    /** the attack was on The Organist, an investigator at the attacker's location has a clue, and the limit allows */
    attackedHim: (game: GameContext, ctx: EffCtx) => {
      const o = organist(game);
      const by = ctx.inv;
      if (
        !o ||
        !by ||
        currentTest(game)?.target !== o.id ||
        usedThisRound(game) >= playerCount(game)
      )
        return false;
      const here = inv(game, by).location;
      return activeInvs(game).some((i) => inv(game, i).location === here && inv(game, i).clues > 0);
    },
  },
  fns: {
    clueOnHim(game: GameContext, run: ScriptRun) {
      const o = organist(game);
      const by = run.ctx.inv;
      if (!o || !by) return;
      const here = inv(game, by).location;
      const who = run.chooseInvestigator(
        activeInvs(game).filter((i) => inv(game, i).location === here && inv(game, i).clues > 0),
        { text: "Who places 1 clue on The Organist?", key: "apotClueOnOrganist" },
      );
      flags.rememberedFact.set(
        game,
        `apotOrganistClue:${currentRound(game)}:${usedThisRound(game)}`,
        true,
      );
      addCounter(game, who, "clues", -1);
      addCounter(game, o.id, "clues", 1);
      emit(game, EVENT.Clues, `${invName(game, who)} places 1 clue on The Organist`, {
        inv: who,
        card: o.id,
      });
      queue(game, checkObjectives());
    },
    lostLamb,
  },
} satisfies CardScript;
