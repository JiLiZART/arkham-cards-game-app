/** Effects that start a skill test and change its numbers. */
import {
  ask,
  card,
  currentTest,
  def,
  emit,
  exhaust,
  type GameContext,
  inv,
  invName,
  push,
  setEngaged,
} from "../context";
import {
  addTempMod,
  attackable,
  connections,
  enemiesAt,
  engagedWith,
  immuneTo,
  isElite,
  committedSkillsOf,
  matchesFilter,
} from "../queries";
import { win } from "../rules/cards";
import { basicInvestigate } from "../rules/round";
import { canMoveTo } from "../rules/investigators";
import { attackDamage, forceResult, startTest } from "../rules/skillTest";
import type { InstId, Step } from "../world/types";
import { amt, enemyTargets, invTargets, opt } from "./targets";
import type { EffectOf, EffectRun } from "./types";
import { EVENT } from "../events/event";
import { CHOICE, ZONE } from "../world/constants";
import { moveCard } from "../movement";
import { STEP } from "../steps/step";

function skillTestEffect(game: GameContext, run: EffectRun<EffectOf<"skillTest">>) {
  const { step, ctx, you } = run;
  const e = run.effect;

  const skills = Array.isArray(e.skill) ? e.skill : [e.skill];
  const difficulty = amt(game, e.difficulty, ctx);
  const skill = ask<(typeof skills)[number]>(
    game,
    step,
    you,
    CHOICE.Generic,
    "Choose which skill to test",
    skills.map((s) => ({ id: s, label: `Test ${s} (${difficulty})`, value: s })),
    { auto: true },
  );
  if (skill === undefined) return;
  startTest(game, {
    inv: you,
    skill,
    kind: "plain",
    difficulty,
    source: ctx.source,
    onSuccess: e.onSuccess,
    onFail: e.onFail,
    perPointFailed: e.perPointFailed,
    ctx,
  });
  return;
}

function fightEffect(game: GameContext, run: EffectRun<EffectOf<"fight">>) {
  const { step, ctx, you } = run;
  const e = run.effect;

  const ts = enemyTargets(
    game,
    step,
    e.target ?? "chooseAtLocation",
    ctx,
    (id) =>
      attackable(game, id, ctx.source, you) &&
      (!e.notEngagedWithYou || card(game, id).engagedWith !== you) &&
      (!e.filter || matchesFilter(game, card(game, id).code, e.filter)),
  );
  if (!ts?.length) return;
  const fctx = { ...ctx, enemy: ts[0] };
  startTest(game, {
    inv: you,
    skill: e.skill ?? "combat",
    kind: "fight",
    target: ts[0],
    source: ctx.source,
    skillBonus: e.bonus === undefined ? undefined : amt(game, e.bonus, fctx),
    damageBonus: e.damageBonus === undefined ? 0 : amt(game, e.damageBonus, fctx),
    extraDamageIf: e.extraDamageIf,
    extraDamage: e.extraDamage,
    onSuccess: e.onSuccess,
    onFail: e.onFail,
    onTokens: e.onTokens,
    marginDamage: e.extraDamageIfSucceedBy,
    damagePerMargin: e.damagePerMargin,
    boost: e.boost,
    onDefeat: e.onDefeat,
    autoSucceed: e.auto,
    baseSkill: e.baseSkill,
    noDamageToOthersOnFail: e.noDamageToOthersOnFail,
    ctx: fctx,
  });
  return;
}

function investigateEffect(game: GameContext, run: EffectRun<EffectOf<"investigate">>) {
  const { step, ctx, you } = run;
  const e = run.effect;

  let loc = inv(game, you).location;
  if (!loc) return;
  // "you may move to a connecting location immediately before investigating" (Duke): then investigate from there
  if (e.moveFirst) {
    const to = connections(game, loc).filter((l) => canMoveTo(game, you, l));
    const pick = ask<InstId | "stay">(
      game,
      step,
      you,
      CHOICE.Target,
      "Move to a connecting location first?",
      [
        { id: "stay", label: "Investigate here", value: "stay", key: "option.investigateHere" },
        ...to.map((l) => opt(game, l)),
      ],
      { auto: true, key: "moveFirst" },
    );
    if (pick === undefined) return;
    const rest: Step = {
      ...step,
      choice: undefined,
      effect: { ...e, moveFirst: undefined },
    };
    push(game, ...(pick === "stay" ? [] : [{ t: STEP.Move, inv: you, to: pick } as Step]), rest);
    return;
  }
  if (e.at === "connecting") {
    const cands = connections(game, loc).filter((l) => card(game, l).revealed);
    if (!cands.length) return;
    const pick = ask<InstId>(
      game,
      step,
      you,
      CHOICE.Target,
      "Choose a location to investigate",
      cands.map((l) => opt(game, l)),
      { auto: true, key: "chooseInvestigateLocation" },
    );
    if (pick === undefined) return;
    loc = pick;
  }
  basicInvestigate(game, you, loc, {
    bonus: e.bonus === undefined ? undefined : amt(game, e.bonus, ctx),
    boost: e.boost,
    shroud: e.shroud,
    skill: def(game, loc).investigateSkill ?? e.skill,
    insteadOfClues: e.insteadOfClues,
    source: ctx.source,
    onSuccess: e.onSuccess,
    onFail: e.onFail,
    onTokens: e.onTokens,
    baseSkill: e.baseSkill,
    extraClues: e.extraClues,
  });
  return;
}

/** an enemy with no printed evade value cannot be evaded, not even automatically (Yog-Sothoth) */
const evadable = (game: GameContext, id: InstId) => def(game, id).enemy?.evade !== null;

function evadeEffect(game: GameContext, run: EffectRun<EffectOf<"evade">>) {
  const { step, ctx, you } = run;
  const e = run.effect;

  const loc = inv(game, you).location;
  if (e.all || e.auto) {
    // evading automatically is the card's effect, not a test: an enemy immune to it stays
    let ts = (e.all === "engaged" ? engagedWith(game, you) : enemiesAt(game, loc))
      .filter((x) => evadable(game, x.id) && !immuneTo(game, x.id, ctx.source))
      .filter((x) => !e.filter || matchesFilter(game, x.code, e.filter))
      .map((x) => x.id)
      .filter((id) => !e.nonElite || !isElite(game, id));
    if (!e.all) {
      if (!ts.length) return;
      const pick = ask<InstId>(
        game,
        step,
        you,
        CHOICE.Target,
        "Choose an enemy to evade",
        ts.map((id) => opt(game, id)),
        { auto: true, key: "evade" },
      );
      if (pick === undefined) return;
      ts = [pick];
    }
    for (const id of ts) {
      const en = card(game, id);
      exhaust(game, en.id);
      setEngaged(game, en.id, null);
      emit(game, EVENT.Evade, `${invName(game, you)} evades ${def(game, id).name}`, {
        inv: you,
        card: id,
      });
      push(game, win("enemyEvaded", { inv: you, enemy: id }));
    }
    return;
  }
  const engaged = engagedWith(game, you)
    .filter((x) => evadable(game, x.id))
    .filter((x) => !e.filter || matchesFilter(game, x.code, e.filter))
    .map((x) => x.id);
  if (!engaged.length) return;
  const pick = ask<InstId>(
    game,
    step,
    you,
    CHOICE.Target,
    "Choose an enemy to evade",
    engaged.map((id) => opt(game, id)),
    { auto: true, key: "evade" },
  );
  if (pick === undefined) return;
  // "if you succeed and the enemy is non-[[Elite]], evade it and …" (Bait and Switch): an Elite one is untouched
  const untouched = !!e.nonElite && isElite(game, pick);
  startTest(game, {
    inv: you,
    skill: e.skill ?? "agility",
    kind: "evade",
    target: pick,
    source: ctx.source,
    skillBonus: e.bonus === undefined ? undefined : amt(game, e.bonus, ctx),
    baseSkill: e.baseSkill,
    noEvade: untouched,
    onSuccess: untouched ? undefined : e.onSuccess,
    onFail: e.onFail,
    onTokens: e.onTokens,
    ctx: { ...ctx, enemy: pick },
  });
  return;
}

function modifyEffect(game: GameContext, run: EffectRun<EffectOf<"modify">>) {
  const { step, ctx, you } = run;
  const e = run.effect;

  if (e.on === "yourLocation") {
    const loc = inv(game, you).location;
    if (loc) addTempMod(game, { ...e.mod, scope: undefined }, loc, e.until, ctx.source ?? null);
    return;
  }
  const tester = currentTest(game)?.inv;
  const target = e.until === "test" && tester ? tester : invTargets(game, step, e.target, ctx)?.[0];
  if (!target) return;
  addTempMod(game, e.mod, target, e.until, ctx.source ?? null);
  // the feed words it from data (mod.stat.* / mod.flag.*); the text is the log's plain English
  const what = (e.mod.stat ?? e.mod.flag ?? "").replace(/[A-Z]/g, (c) => ` ${c.toLowerCase()}`);
  const by = e.mod.value !== undefined ? ` ${e.mod.value >= 0 ? "+" : ""}${e.mod.value}` : "";
  emit(
    game,
    EVENT.Modify,
    `${invName(game, target)} gets ${what}${by} until the end of the ${e.until}`,
    {
      inv: target,
      data: { stat: e.mod.stat, flag: e.mod.flag, value: e.mod.value, until: e.until },
    },
  );
  return;
}

/** the failed attack under way deals its damage to another enemy at your location, you choose which (Oops!) */
function redirectDamageEffect(game: GameContext, run: EffectRun<EffectOf<"redirectDamage">>) {
  const t = currentTest(game);
  if (!t || t.kind !== "fight") return;
  const ts = enemyTargets(
    game,
    run.step,
    "chooseAtLocation",
    run.ctx,
    (id) => id !== t.target && attackable(game, id, t.source),
  );
  if (!ts?.length) return;
  // the investigator the attacked enemy is engaged with takes none of it (Oops! 2, before the failure is applied)
  t.noDamageToOthersOnFail = true;
  push(game, {
    t: STEP.DamageEnemy,
    enemy: ts[0],
    amount: attackDamage(game, t),
    by: t.inv,
    attack: true,
    source: t.source,
  });
}

/** a skill card you own committed to the test under way goes back to your hand (Try and Try Again) */
function returnCommittedSkillEffect(
  game: GameContext,
  run: EffectRun<EffectOf<"returnCommittedSkill">>,
) {
  const mine = committedSkillsOf(game, run.you);
  if (!mine.length) return;
  const pick = ask<InstId>(
    game,
    run.step,
    run.you,
    CHOICE.Target,
    "Choose a skill card to return to your hand",
    mine.map((id) => opt(game, id)),
    { auto: true, key: "returnCommittedSkill" },
  );
  if (pick === undefined) return;
  moveCard(game, pick, ZONE.Hand);
}

/** the test under way succeeds or fails whatever its total */
function forceResultEffect(game: GameContext, run: EffectRun<EffectOf<"forceResult">>) {
  forceResult(game, run.effect.result);
}

export const testsEffects = {
  forceResult: forceResultEffect,
  redirectDamage: redirectDamageEffect,
  returnCommittedSkill: returnCommittedSkillEffect,
  skillTest: skillTestEffect,
  fight: fightEffect,
  investigate: investigateEffect,
  evade: evadeEffect,
  modify: modifyEffect,
};
