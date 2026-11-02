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
  checkCondition,
  connections,
  enemiesAt,
  engagedWith,
  isElite,
} from "../queries";
import { win } from "../rules/cards";
import { basicInvestigate } from "../rules/round";
import { startTest } from "../rules/skillTest";
import type { InstId } from "../world/types";
import { amt, enemyTargets, invTargets, opt } from "./targets";
import type { EffectOf, EffectRun } from "./types";
import { EVENT } from "../events/event";
import { CHOICE } from "../world/constants";

function skillTestEffect(game: GameContext, run: EffectRun<EffectOf<"skillTest">>) {
  const { step, ctx, you } = run;
  const e = run.effect;

  const skills = Array.isArray(e.skill) ? e.skill : [e.skill];
  const skill = ask<(typeof skills)[number]>(
    game,
    step,
    you,
    CHOICE.Generic,
    "Choose which skill to test",
    skills.map((s) => ({ id: s, label: `Test ${s} (${e.difficulty})`, value: s })),
    { auto: true },
  );
  if (skill === undefined) return;
  startTest(game, {
    inv: you,
    skill,
    kind: "plain",
    difficulty: e.difficulty,
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

  const ts = enemyTargets(game, step, e.target ?? "chooseAtLocation", ctx, (id) =>
    attackable(game, id),
  );
  if (!ts?.length) return;
  const fctx = { ...ctx, enemy: ts[0] };
  const extra = e.extraDamageIf && checkCondition(game, e.extraDamageIf, fctx) ? 1 : 0;
  startTest(game, {
    inv: you,
    skill: e.skill ?? "combat",
    kind: "fight",
    target: ts[0],
    source: ctx.source,
    skillBonus: e.bonus,
    damageBonus: (e.damageBonus ?? 0) + extra,
    onSuccess: e.onSuccess,
    onFail: e.onFail,
    onTokens: e.onTokens,
    marginDamage: e.extraDamageIfSucceedBy,
    damagePerMargin: e.damagePerMargin,
    boost: e.boost,
    onDefeat: e.onDefeat,
    autoSucceed: e.auto,
    ctx: fctx,
  });
  return;
}

function investigateEffect(game: GameContext, run: EffectRun<EffectOf<"investigate">>) {
  const { step, ctx, you } = run;
  const e = run.effect;

  let loc = inv(game, you).location;
  if (!loc) return;
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
  });
  return;
}

function evadeEffect(game: GameContext, run: EffectRun<EffectOf<"evade">>) {
  const { step, ctx, you } = run;
  const e = run.effect;

  const loc = inv(game, you).location;
  if (e.all || e.auto) {
    let ts = enemiesAt(game, loc)
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
  const engaged = engagedWith(game, you).map((x) => x.id);
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
  startTest(game, {
    inv: you,
    skill: e.skill ?? "agility",
    kind: "evade",
    target: pick,
    source: ctx.source,
    skillBonus: e.bonus === undefined ? undefined : amt(game, e.bonus, ctx),
    onSuccess: e.onSuccess,
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

export const testsEffects = {
  skillTest: skillTestEffect,
  fight: fightEffect,
  investigate: investigateEffect,
  evade: evadeEffect,
  modify: modifyEffect,
};
