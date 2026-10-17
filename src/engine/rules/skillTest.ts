import type { Effect, Skill, SymbolToken } from "../../content/schema";
import { randInt } from "../rng";
import {
  abilitiesOf, ask, card, checkCondition, def, emit, enemyStat, expireMods, hasFlag, inv, invName, invsAt, modSum,
  moveCard, push, shroud, skillValue, type G,
} from "../core";
import type { EffCtx, InstId, InvId, SkillTestState, Step } from "../types";
import { activatable, win } from "./cards";
import { attackKey } from "./enemies";
import { tokenX } from "./tokens";

type Handler<T extends Step["t"]> = (g: G, step: Extract<Step, { t: T }>) => void;

export interface TestOpts {
  inv: InvId;
  skill: Skill;
  kind: SkillTestState["kind"];
  difficulty?: number;
  source?: InstId | null;
  label?: string;
  target?: InstId | null;
  skillBonus?: number;
  damageBonus?: number;
  shroudMod?: number;
  onSuccess?: Effect[];
  onFail?: Effect[];
  perPointFailed?: Effect[];
  insteadOfClues?: Effect[];
  after?: { code: string; fn: string };
  onTokens?: { tokens: string[]; effects: Effect[] };
  marginDamage?: number;
  ctx: EffCtx;
}

export function startTest(g: G, o: TestOpts) {
  if (g.s.skillTest) g.s.testStack.push(g.s.skillTest);
  g.s.counters.test++;
  const t: SkillTestState = {
    id: g.s.counters.test,
    inv: o.inv,
    skill: o.skill,
    difficulty: o.difficulty ?? 0,
    kind: o.kind,
    source: o.source ?? null,
    sourceLabel: o.label ?? (o.source ? def(g, o.source).name : o.kind),
    target: o.target ?? null,
    committed: [],
    committers: [],
    tokens: [],
    tokenMods: [],
    autoFail: false,
    autoSucceed: false,
    skillBonus: o.skillBonus ?? 0,
    damageBonus: o.damageBonus ?? 0,
    shroudMod: o.shroudMod ?? 0,
    onSuccess: o.onSuccess,
    onFail: o.onFail,
    perPointFailed: o.perPointFailed,
    insteadOfClues: o.insteadOfClues,
    after: o.after,
    onTokens: o.onTokens,
    marginDamage: o.marginDamage,
    ctx: o.ctx,
    tokenOnFail: [],
    tokenAfter: [],
    tokenOnSuccess: [],
    failWindowDone: false,
    resolvedTokens: 0,
    flipNegative: false,
  };
  g.s.skillTest = t;
  emit(g, "testStart", `${invName(g, o.inv)} tests ${o.skill} (${t.sourceLabel})`, { inv: o.inv, card: o.target ?? o.source ?? null, data: { kind: o.kind, skill: o.skill } });
  push(g, { t: "Test", stage: "commit", asked: [] });
}

const test = (g: G) => {
  const t = g.s.skillTest;
  if (!t) throw new Error("no skill test in progress");
  return t;
};

export function difficultyOf(g: G, t: SkillTestState): number {
  if (t.kind === "investigate" && t.target) return Math.max(0, shroud(g, t.target) + t.shroudMod);
  if (t.kind === "fight" && t.target) return enemyStat(g, t.target, "fight");
  if (t.kind === "evade" && t.target) return enemyStat(g, t.target, "evade");
  return t.difficulty;
}

/** icons a card contributes to a test */
export function iconsFor(g: G, cardId: InstId, skill: Skill): number {
  const icons = def(g, cardId).icons;
  return (icons[skill] ?? 0) + (icons.wild ?? 0);
}

export function canCommit(g: G, who: InvId, cardId: InstId, t: SkillTestState): boolean {
  const d = def(g, cardId);
  if (d.subtype) return false;
  if (iconsFor(g, cardId, t.skill) === 0) return false;
  if (d.commitOnlyOwnTest && who !== t.inv) return false;
  if (d.maxCommitted !== undefined && t.committed.filter((c) => card(g, c).code === d.code).length >= d.maxCommitted) return false;
  return true;
}

/** the current skill value without tokens, part by part: base skill, each committed card's icons, other modifiers */
export function testParts(g: G, t: SkillTestState) {
  const base = skillValue(g, t.inv, t.skill);
  const icons = t.committed.map((c) => ({ card: c, n: iconsFor(g, c, t.skill) }));
  const mods = t.skillBonus + modSum(g, t.inv, "testValue");
  return { base, icons, mods, total: base + icons.reduce((n, i) => n + i.n, 0) + mods, difficulty: difficultyOf(g, t) };
}

/** current skill value without tokens */
export const testValue = (g: G, t: SkillTestState): number => testParts(g, t).total;

function commitStage(g: G, step: Extract<Step, { t: "Test" }>) {
  const t = test(g);
  const asked = step.asked ?? [];
  const peril = !!g.s.flags.peril;
  const loc = inv(g, t.inv).location;
  const order = [t.inv, ...(peril ? [] : invsAt(g, loc).filter((i) => i !== t.inv))];
  const who = order.find((i) => !asked.includes(i));
  if (!who) {
    push(g, { t: "Test", stage: "reveal" });
    return;
  }
  const me = inv(g, who);
  const cards = me.hand.filter((h) => canCommit(g, who, h, t));
  const fast = activatable(g, who, ["fast"]).filter((r) => r.ability.effects?.some((e) => e.op === "modify") || r.ability.run);
  const mine = t.committed.filter((c, k) => t.committers[k] === who);
  if (cards.length === 0 && fast.length === 0 && mine.length === 0) {
    push(g, { ...step, choice: undefined, asked: [...asked, who] });
    return;
  }
  const opts = [
    { id: "done", label: who === t.inv ? `Done (value ${testValue(g, t)} vs ${difficultyOf(g, t)})` : "Done", value: "done" },
    ...cards.map((h) => ({ id: h, label: `Commit ${def(g, h).name} (+${iconsFor(g, h, t.skill)})`, card: h, value: { commit: h } })),
    ...fast.map((r) => ({ id: `${r.card}:${r.index}`, label: r.ability.label ?? `Use ${def(g, r.card).name}`, card: r.card, value: { ability: r } })),
    // cards committed in this window can be taken back until Done
    ...mine.map((c) => ({ id: `un:${c}`, label: `Take back ${def(g, c).name}`, card: c, value: { uncommit: c } })),
  ];
  const pick = ask<"done" | { commit: InstId } | { uncommit: InstId } | { ability: { card: InstId; index: number } }>(
    g, step, who, "commit", `${me.name}: commit cards to ${invName(g, t.inv)}'s ${t.skill} test`, opts,
    { key: who === t.inv ? "commit" : "commitOther", vars: { by: t.inv, skill: t.skill } },
  );
  if (pick === undefined) return;
  if (pick === "done") {
    push(g, { ...step, choice: undefined, asked: [...asked, who] });
    return;
  }
  if ("commit" in pick) {
    moveCard(g, pick.commit, "commit");
    card(g, pick.commit).controller = who;
    t.committed.push(pick.commit);
    t.committers.push(who);
    emit(g, "commit", `${me.name} commits ${def(g, pick.commit).name}`, { inv: who, card: pick.commit });
  } else if ("uncommit" in pick) {
    const k = t.committed.indexOf(pick.uncommit);
    t.committed.splice(k, 1);
    t.committers.splice(k, 1);
    moveCard(g, pick.uncommit, "hand");
    emit(g, "uncommit", `${me.name} takes back ${def(g, pick.uncommit).name}`, { inv: who, card: pick.uncommit });
  } else {
    // the ability resolves first (its bonus and cost), then the window asks again
    push(g, { t: "UseAbility", inv: who, card: pick.ability.card, index: pick.ability.index }, { ...step, choice: undefined });
    return;
  }
  push(g, { ...step, choice: undefined });
}

function revealStage(g: G) {
  const t = test(g);
  if (hasFlag(g, t.inv, "noChaosTokens")) {
    emit(g, "noToken", "No chaos token is revealed", { inv: t.inv });
    push(g, { t: "Test", stage: "result" });
    return;
  }
  if (g.s.chaosBag.length === 0) throw new Error("chaos bag is empty");
  const [token] = g.s.chaosBag.splice(randInt(g.s, g.s.chaosBag.length), 1);
  t.tokens.push(token);
  // what is being tested travels with the token, so the draw can show it after the test has already resolved
  const p = testParts(g, t);
  emit(g, "token", `Revealed chaos token: ${token}`, {
    inv: t.inv,
    card: t.target ?? t.source ?? null,
    data: { token, testId: t.id, skill: t.skill, kind: t.kind, value: p.total, difficulty: p.difficulty },
  });
  const key = `tok:${t.id}:${g.s.seq++}`;
  t.tokenKey = key;
  push(g, win("tokenRevealed", { inv: t.inv, token, key, testId: t.id }), { t: "Test", stage: "afterReveal" });
}

function afterRevealStage(g: G) {
  const t = test(g);
  const idx = t.tokens.length - 1;
  if (t.tokenKey && g.s.cancelled.includes(t.tokenKey)) {
    const [tok] = t.tokens.splice(idx, 1);
    g.s.chaosBag.push(tok);
    emit(g, "tokenCancelled", `${tok} is cancelled and returned to the bag`, { inv: t.inv });
    push(g, { t: "Test", stage: "reveal" });
    return;
  }
  push(g, { t: "Test", stage: "resolveTokens" });
}

function resolveTokensStage(g: G) {
  const t = test(g);
  const scen = g.db.scenarios[g.s.scenarioId];
  const ctx: EffCtx = { ...t.ctx, you: t.inv, inv: t.inv, testId: t.id, enemy: t.kind !== "investigate" ? t.target : t.ctx.enemy };
  let revealAnother = false;
  while (t.resolvedTokens < t.tokens.length) {
    const token = t.tokens[t.resolvedTokens++];
    let mod = 0;
    if (/^[+-]?\d+$/.test(token)) mod = Number(token);
    else if (token === "autoFail") t.autoFail = true;
    else if (token === "elderSign" && hasFlag(g, t.inv, "elderSignIsAutoFail")) t.autoFail = true;
    else if (token === "elderSign") {
      const invCard = inv(g, t.inv).cardId;
      const es = abilitiesOf(g, invCard).find((a) => a.kind === "elderSign");
      if (es) {
        const v = es.tokenValue ?? 0;
        mod = v === "cluesOnLocation" ? card(g, inv(g, t.inv).location!).clues : v === "horrorOnYou" ? inv(g, t.inv).horror : v;
        if (es.effects) t.tokenOnSuccess.push(...es.effects);
        // runs now so it can adjust the current test (auto-succeed, extra on-success effects)
        if (es.run) g.db.scripts[card(g, invCard).code]?.fns?.[es.run]?.(g, { ...ctx, source: invCard });
      }
    } else {
      const eff = scen.tokens[g.s.difficulty]?.[token as SymbolToken];
      if (eff) {
        mod = eff.modifier === "X" ? -tokenX(g, eff.x!, t.inv) : eff.modifier;
        const condOk = !eff.condition || checkCondition(g, eff.condition, ctx);
        if (condOk && eff.onReveal) push(g, { t: "Effects", effects: eff.onReveal, ctx: { ...ctx, token } });
        if (condOk && eff.onFail) t.tokenOnFail.push(...eff.onFail);
        if (eff.revealAnother === true) revealAnother = true;
        if (eff.revealAnother === "ifAncientOneInPlay" && Object.values(g.s.cards).some((c) => c.zone === "enemy" && def(g, c.id).traits.includes("Ancient One"))) revealAnother = true;
      }
    }
    t.tokenMods.push(mod);
  }
  if (revealAnother) {
    push(g, { t: "Test", stage: "reveal" });
    return;
  }
  push(g, { t: "Test", stage: "result" });
}

export function tokenTotal(g: G, t: SkillTestState): number {
  const double = t.kind === "evade" && t.target && hasFlag(g, t.target, "doubleNegativeTokens");
  return t.tokenMods.reduce((n, m) => {
    let v = m;
    if (v < 0 && double) v *= 2;
    if (v < 0 && t.flipNegative) v = -v;
    return n + v;
  }, 0);
}

function resultStage(g: G) {
  const t = test(g);
  const value = testValue(g, t);
  const tokens = tokenTotal(g, t);
  const total = Math.max(0, value + tokens);
  const diff = difficultyOf(g, t);
  const success = t.autoSucceed || (!t.autoFail && total >= diff);
  if (!success && !t.failWindowDone) {
    t.failWindowDone = true;
    push(g, win("wouldFailSkillTest", { inv: t.inv, testId: t.id, margin: total - diff, key: `fail:${t.id}` }), { t: "Test", stage: "result" });
    return;
  }
  t.value = value;
  t.total = total;
  t.success = success;
  t.margin = total - diff;
  const tokText = t.tokens.length ? t.tokens.join(", ") : "none";
  const icons = t.committed.reduce((n, c) => n + iconsFor(g, c, t.skill), 0);
  const base = value - icons;
  emit(
    g, "testResult",
    `${invName(g, t.inv)}: ${base}${icons ? ` + ${icons} (committed)` : ""} ${tokens >= 0 ? "+" : "−"} ${Math.abs(tokens)} (${tokText}) = ${total} vs ${diff} → ${success ? "Success" : "Fail"}${t.autoFail ? " (auto-fail)" : ""}${t.autoSucceed ? " (auto-success)" : ""}`,
    { inv: t.inv, data: { skill: t.skill, base, icons, value, tokens: t.tokens, tokenMods: [...t.tokenMods], tokenTotal: tokens, total, difficulty: diff, success, testId: t.id } },
  );
  push(g, { t: "Test", stage: "apply" });
}

function applyStage(g: G) {
  const t = test(g);
  const ok = !!t.success;
  const failBy = ok ? undefined : Math.max(0, -(t.margin ?? 0));
  const ctx: EffCtx = {
    ...t.ctx, you: t.ctx.you ?? t.inv, inv: t.ctx.inv ?? t.inv, testId: t.id,
    failBy, succeedBy: ok ? t.margin : undefined,
    enemy: t.kind === "fight" || t.kind === "evade" ? t.target : t.ctx.enemy,
    location: t.kind === "investigate" ? t.target : t.ctx.location,
  };
  const steps: Step[] = [];
  // committed cards' own effects (skill cards)
  for (const c of t.committed) {
    for (const a of abilitiesOf(g, c)) {
      if (a.kind !== "onPlay") continue;
      const cctx = { ...ctx, source: c, you: card(g, c).owner ?? t.inv };
      if (a.condition && !checkCondition(g, a.condition, cctx)) continue;
      if (a.run) steps.push({ t: "Script", code: card(g, c).code, fn: a.run, ctx: cctx });
      else if (a.effects) steps.push({ t: "Effects", effects: a.effects, ctx: cctx });
    }
  }
  steps.push({ t: "Test", stage: "kindResult" });
  const list = ok ? t.onSuccess : t.onFail;
  if (list?.length) steps.push({ t: "Effects", effects: list, ctx });
  if (!ok && t.perPointFailed?.length) for (let k = 0; k < failBy!; k++) steps.push({ t: "Effects", effects: t.perPointFailed, ctx });
  if (!ok && t.tokenOnFail.length) steps.push({ t: "Effects", effects: t.tokenOnFail, ctx });
  if (ok && t.tokenOnSuccess.length) steps.push({ t: "Effects", effects: t.tokenOnSuccess, ctx });
  if (t.onTokens && t.tokens.some((x) => t.onTokens!.tokens.includes(x))) steps.push({ t: "Effects", effects: t.onTokens.effects, ctx });
  if (t.after) steps.push({ t: "Script", code: t.after.code, fn: t.after.fn, ctx });
  if (ok) {
    if (t.kind === "investigate") steps.push(win("successfulInvestigate", { inv: t.inv, location: null, margin: t.margin, testId: t.id }));
    if (t.kind === "fight") steps.push(win("successfulAttack", { inv: t.inv, margin: t.margin, testId: t.id }));
    steps.push(win("skillTestSucceeded", { inv: t.inv, margin: t.margin, testId: t.id }));
  } else steps.push(win("skillTestFailed", { inv: t.inv, margin: t.margin, testId: t.id }));
  steps.push({ t: "Test", stage: "end" });
  push(g, ...steps);
}

function kindResultStage(g: G) {
  const t = test(g);
  const steps: Step[] = [];
  if (t.success) {
    if (t.kind === "investigate" && t.target) {
      if (t.insteadOfClues) steps.push({ t: "Effects", effects: t.insteadOfClues, ctx: { ...t.ctx, you: t.inv, location: t.target } });
      else steps.push({ t: "DiscoverClues", inv: t.inv, location: t.target, n: 1 + modSum(g, t.inv, "clueBonus") });
      steps.push(win("locationInvestigated", { location: t.target, inv: null }));
    }
    if (t.kind === "fight" && t.target) {
      steps.push({ t: "DamageEnemy", enemy: t.target, amount: 1 + t.damageBonus + modSum(g, t.inv, "attackDamage") + (t.marginDamage !== undefined && (t.margin ?? 0) >= t.marginDamage ? 1 : 0), by: t.inv, attack: true });
    }
    if (t.kind === "evade" && t.target) {
      const e = g.s.cards[t.target];
      if (e?.zone === "enemy") {
        e.exhausted = true;
        e.engagedWith = null;
        emit(g, "evade", `${invName(g, t.inv)} evades ${def(g, t.target).name}`, { inv: t.inv, card: t.target });
        steps.push(win("enemyEvaded", { inv: t.inv, enemy: t.target }));
      }
    }
  } else if (t.target && (t.kind === "fight" || t.kind === "evade")) {
    const e = g.s.cards[t.target];
    const kw = t.kind === "fight" ? "retaliate" : "alert";
    if (e?.zone === "enemy" && !e.exhausted && def(g, t.target).keywords.includes(kw)) {
      emit(g, kw, `${def(g, t.target).name} ${kw === "retaliate" ? "retaliates" : "is alert"}!`, { card: t.target });
      steps.push({ t: "EnemyAttack", enemy: t.target, inv: t.inv, aoo: true, key: attackKey(g) });
    }
  }
  push(g, ...steps);
}

function endStage(g: G) {
  const t = test(g);
  for (const c of t.committed) if (g.s.cards[c]?.zone === "commit") moveCard(g, c, "discard");
  g.s.chaosBag.push(...t.tokens);
  expireMods(g, "test");
  g.s.skillTest = g.s.testStack.pop() ?? null;
  delete g.s.flags.peril;
  push(g, win("skillTestEnds", { inv: t.inv, testId: t.id }));
}

export const testHandler: Handler<"Test"> = (g, step) => {
  switch (step.stage) {
    case "commit": return commitStage(g, step);
    case "reveal": return revealStage(g);
    case "afterReveal": return afterRevealStage(g);
    case "resolveTokens": return resolveTokensStage(g);
    case "result": return resultStage(g);
    case "apply": return applyStage(g);
    case "kindResult": return kindResultStage(g);
    case "end": return endStage(g);
  }
};

export const handlers = { Test: testHandler };
