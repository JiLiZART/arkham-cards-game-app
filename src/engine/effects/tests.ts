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
  locations,
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
import { gainedIcons, returnAfterTest } from "../world/flags";
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
    onTokens: e.onTokens,
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
    ...(e.retaliate ? { retaliate: e.retaliate } : {}),
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
  if (e.at) {
    // a revealed connecting location (Local Map), or any revealed one, as if you were there (In the Know)
    const cands = (
      e.at === "connecting" ? connections(game, loc) : locations(game).map((l) => l.id)
    ).filter((l) => card(game, l).revealed);
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
    const fits = (id: InstId) =>
      evadable(game, id) &&
      !immuneTo(game, id, ctx.source) &&
      (!e.filter || matchesFilter(game, card(game, id).code, e.filter)) &&
      (!e.nonElite || !isElite(game, id));
    // a named enemy: an engaged one you choose, or the event's (Archaic Glyphs, Cheap Shot)
    const named = e.target && !e.all ? enemyTargets(game, step, e.target, ctx, fits) : null;
    if (named === undefined) return;
    let ts =
      named ??
      (e.all === "engaged" ? engagedWith(game, you) : enemiesAt(game, loc))
        .map((x) => x.id)
        .filter(fits);
    if (!e.all && !named) {
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
    ...(e.noExhaust ? { evadeNoExhaust: true } : {}),
    ...(e.cannotEngageYou ? { noEngageAfterEvade: true } : {}),
    ctx: { ...ctx, enemy: pick },
  });
  return;
}

function modifyEffect(game: GameContext, run: EffectRun<EffectOf<"modify">>) {
  const { step, ctx, you } = run;
  const e = run.effect;

  // a value worked out as it resolves (Fight or Flight: the horror on you)
  const mod = e.amount === undefined ? e.mod : { ...e.mod, value: amt(game, e.amount, ctx) };
  if (e.on === "yourLocation" || e.on === "eventEnemy") {
    const on = e.on === "yourLocation" ? inv(game, you).location : ctx.enemy;
    if (on && (e.on === "yourLocation" || card(game, on).zone === ZONE.Enemy))
      addTempMod(game, { ...mod, scope: undefined }, on, e.until, ctx.source ?? null);
    return;
  }
  const tester = currentTest(game)?.inv;
  const target = e.until === "test" && tester ? tester : invTargets(game, step, e.target, ctx)?.[0];
  if (!target) return;
  addTempMod(game, mod, target, e.until, ctx.source ?? null, false, e.next);
  // the feed words it from data (mod.stat.* / mod.flag.*); the text is the log's plain English
  const what = (mod.stat ?? mod.flag ?? "").replace(/[A-Z]/g, (c) => ` ${c.toLowerCase()}`);
  const by = mod.value !== undefined ? ` ${mod.value >= 0 ? "+" : ""}${mod.value}` : "";
  emit(
    game,
    EVENT.Modify,
    `${invName(game, target)} gets ${what}${by} until the end of the ${e.until}`,
    {
      inv: target,
      data: { stat: mod.stat, flag: mod.flag, value: mod.value, until: e.until },
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
  const e = run.effect;
  const t = currentTest(game);
  // any skill card committed, to its owner's hand (Minh Thi Phan's elder sign), or one you own
  const mine = e.anyOwner
    ? (t?.committed ?? []).filter(
        (c) =>
          card(game, c).zone === ZONE.Commit &&
          !!card(game, c).owner &&
          def(game, c).type === "skill",
      )
    : committedSkillsOf(game, run.you);
  if (!mine.length) return;
  const pick = ask<InstId | "none">(
    game,
    run.step,
    run.you,
    CHOICE.Target,
    "Choose a skill card to return to your hand",
    [
      ...mine.map((id) => opt(game, id)),
      ...(e.optional
        ? [{ id: "none", label: "Return none", value: "none" as const, key: "option.returnNone" }]
        : []),
    ],
    { auto: !e.optional, key: "returnCommittedSkill" },
  );
  if (pick === undefined || pick === "none") return;
  // once the test ends, not now: its icons still count (Minh Thi Phan)
  if (e.afterTest) returnAfterTest.set(game, pick, true);
  else moveCard(game, pick, ZONE.Hand);
}

/** the event's card (a card just committed) gains icons until the end of the test (Minh Thi Phan) */
function cardGainsIconsEffect(game: GameContext, run: EffectRun<EffectOf<"cardGainsIcons">>) {
  const c = run.ctx.card;
  if (!c || card(game, c).zone !== ZONE.Commit) return;
  const had = gainedIcons.get(game, c) ?? {};
  const icons = { ...had };
  for (const [k, n] of Object.entries(run.effect.icons) as [keyof typeof icons, number][])
    icons[k] = (icons[k] ?? 0) + n;
  gainedIcons.set(game, c, icons);
  emit(game, EVENT.Modify, `${def(game, c).name} gains icons until the end of the test`, {
    card: c,
    inv: run.you,
  });
}

/** the test under way succeeds or fails whatever its total */
function forceResultEffect(game: GameContext, run: EffectRun<EffectOf<"forceResult">>) {
  forceResult(game, run.effect.result);
}

export const testsEffects = {
  cardGainsIcons: cardGainsIconsEffect,
  forceResult: forceResultEffect,
  redirectDamage: redirectDamageEffect,
  returnCommittedSkill: returnCommittedSkillEffect,
  skillTest: skillTestEffect,
  fight: fightEffect,
  investigate: investigateEffect,
  evade: evadeEffect,
  modify: modifyEffect,
};
