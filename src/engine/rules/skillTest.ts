import { peril } from "../world/flags";
import type { Boost, Effect, Skill, SymbolToken } from "../../content/schema";
import { randInt } from "../world/rng";
import {
  abilitiesOf,
  baseSkill,
  cardBlocked,
  checkCondition,
  enemyStat,
  expireMods,
  hasFlag,
  invsAt,
  isMassive,
  modSum,
  shroud,
} from "../queries";
import {
  allCards,
  ask,
  card,
  cardIf,
  cardOfIf,
  def,
  emit,
  exhaust,
  type GameContext,
  inv,
  invName,
  invOfIf,
  push,
  setController,
  setEngaged,
} from "../context";
import { moveCard } from "../movement";
import type { EffCtx, InstId, InvId, SkillTestState, Step } from "../world/types";
import { activatable, canPay, canPlay, payCost, playable, win } from "./cards";
import { attackKey } from "./enemies";
import { tokenX } from "./tokens";
import { runScript } from "./scripts";
import { EVENT } from "../events/event";
import { ZONE, CHOICE, TEST_STAGE } from "../world/constants";
import { STEP } from "../steps/step";
import { scriptOf } from "../world/scripts";

type Handler<T extends Step["t"]> = (game: GameContext, step: Extract<Step, { t: T }>) => void;

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
  damagePerMargin?: { max: number; instead?: boolean; failMax?: number };
  boost?: Boost;
  onDefeat?: Effect[];
  autoSucceed?: boolean;
  ctx: EffCtx;
}

// ---------- what scripts may change about the test under way (each does nothing without one) ----------
/** the next reveal draws one more token, one of which is chosen (Grotesque Statue, Mask of Silenus) */
export function addExtraReveal(game: GameContext) {
  const t = game.s.skillTest;
  if (t) t.extraReveal = (t.extraReveal ?? 0) + 1;
}
/** the test succeeds or fails whatever its total (Wendy's Amulet, a Ritual Site's tablet) */
export function forceResult(game: GameContext, result: "succeed" | "fail") {
  const t = game.s.skillTest;
  if (t && result === "succeed") t.autoSucceed = true;
  if (t && result === "fail") t.autoFail = true;
}
/** the revealed tokens' "-" becomes a "+" (Sure Gamble) */
export function flipNegativeTokens(game: GameContext) {
  const t = game.s.skillTest;
  if (t) t.flipNegative = true;
}
/** a script run with the token chosen from several (Mask of Silenus) */
export function setOnChoose(game: GameContext, code: string, fn: string) {
  const t = game.s.skillTest;
  if (t) t.onChoose = { code, fn };
}

export function startTest(game: GameContext, o: TestOpts) {
  // an eliminated investigator takes no further part in the scenario (Grimoire, Elimination)
  if (invOfIf(game.s, o.inv)?.status !== "playing") return;
  if (game.s.skillTest) game.s.testStack.push(game.s.skillTest);
  game.s.counters.test++;
  const t: SkillTestState = {
    id: game.s.counters.test,
    inv: o.inv,
    skill: o.skill,
    difficulty: o.difficulty ?? 0,
    kind: o.kind,
    source: o.source ?? null,
    sourceLabel: o.label ?? (o.source ? def(game, o.source).name : o.kind),
    target: o.target ?? null,
    committed: [],
    committers: [],
    tokens: [],
    tokenMods: [],
    autoFail: false,
    autoSucceed: !!o.autoSucceed,
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
    damagePerMargin: o.damagePerMargin,
    boost: o.boost,
    onDefeat: o.onDefeat,
    ctx: o.ctx,
    tokenOnFail: [],
    tokenAfter: [],
    tokenOnSuccess: [],
    failWindowDone: false,
    resolvedTokens: 0,
    flipNegative: false,
  };
  game.s.skillTest = t;
  emit(game, EVENT.TestStart, `${invName(game, o.inv)} tests ${o.skill} (${t.sourceLabel})`, {
    inv: o.inv,
    card: o.target ?? o.source ?? null,
    data: { kind: o.kind, skill: o.skill },
  });
  push(game, { t: STEP.Test, stage: TEST_STAGE.Commit, asked: [] });
}

const test = (game: GameContext) => {
  const t = game.s.skillTest;
  if (!t) throw new Error("no skill test in progress");
  return t;
};

export function difficultyOf(game: GameContext, t: SkillTestState): number {
  if (t.kind === "investigate" && t.target)
    return Math.max(0, shroud(game, t.target) + t.shroudMod);
  if (t.kind === "fight" && t.target) return enemyStat(game, t.target, "fight");
  if (t.kind === "evade" && t.target) return enemyStat(game, t.target, "evade");
  return t.difficulty;
}

/** the skill whose icons count: intellect when Mind over Matter lets it stand in for combat/agility and its whole total (value + committed icons) is higher */
export function testedSkill(game: GameContext, t: SkillTestState): Skill {
  if (t.skill !== "combat" && t.skill !== "agility") return t.skill;
  if (!hasFlag(game, t.inv, "intellectForCombatAndAgility")) return t.skill;
  const total = (s: Skill) =>
    ownSkill(game, t.inv, s) + t.committed.reduce((n, c) => n + iconsFor(game, c, s), 0);
  return total("intellect") > total(t.skill) ? "intellect" : t.skill;
}

const ownSkill = (game: GameContext, i: InvId, s: Skill) =>
  Math.max(0, baseSkill(game, i, s) + modSum(game, i, s));

/** icons a card contributes to a test */
export function iconsFor(game: GameContext, cardId: InstId, skill: Skill): number {
  const d = def(game, cardId);
  const extra = scriptOf(game.db, d.code)?.icons?.(game, cardId) ?? {};
  return (d.icons[skill] ?? 0) + (d.icons.wild ?? 0) + (extra[skill] ?? 0) + (extra.wild ?? 0);
}

export function canCommit(
  game: GameContext,
  who: InvId,
  cardId: InstId,
  t: SkillTestState,
): boolean {
  const d = def(game, cardId);
  if (d.subtype) return false;
  // under Mind over Matter either skill may end up tested, so icons for either count
  const mom =
    (t.skill === "combat" || t.skill === "agility") &&
    hasFlag(game, t.inv, "intellectForCombatAndAgility");
  if (iconsFor(game, cardId, t.skill) === 0 && !(mom && iconsFor(game, cardId, "intellect") > 0))
    return false;
  if (d.commitOnlyOwnTest && who !== t.inv) return false;
  if (cardBlocked(game, who, cardId)) return false;
  if (
    d.maxCommitted !== undefined &&
    t.committed.filter((c) => card(game, c).code === d.code).length >= d.maxCommitted
  )
    return false;
  return true;
}

/** the current skill value without tokens, part by part: base skill, each committed card's icons, other modifiers */
export function testParts(game: GameContext, t: SkillTestState) {
  const skill = testedSkill(game, t);
  const base = ownSkill(game, t.inv, skill);
  const icons = t.committed.map((c) => ({ card: c, n: iconsFor(game, c, skill) }));
  const mods = t.skillBonus + modSum(game, t.inv, "testValue");
  return {
    base,
    icons,
    mods,
    total: base + icons.reduce((n, i) => n + i.n, 0) + mods,
    difficulty: difficultyOf(game, t),
  };
}

/** current skill value without tokens */
export const testValue = (game: GameContext, t: SkillTestState): number => testParts(game, t).total;

function commitStage(game: GameContext, step: Extract<Step, { t: "Test" }>) {
  const t = test(game);
  const asked = step.asked ?? [];
  const perilous = !!peril.get(game);
  const loc = inv(game, t.inv).location;
  const order = [t.inv, ...(perilous ? [] : invsAt(game, loc).filter((i) => i !== t.inv))];
  const who = order.find((i) => !asked.includes(i));
  if (!who) {
    push(game, { t: STEP.Test, stage: TEST_STAGE.Reveal });
    return;
  }
  const me = inv(game, who);
  const mine = t.committed.filter((c, k) => t.committers[k] === who);
  // another investigator at the location commits at most one card (Grimoire, ST.2); they may still take it back
  const cards =
    who !== t.inv && mine.length >= 1 ? [] : me.hand.filter((h) => canCommit(game, who, h, t));
  // a player window: any [fast] ability, and fast cards playable now (Grimoire, ST.1)
  const fast = activatable(game, who, ["fast"]);
  const plays = playable(game, who).filter((h) => canPlay(game, who, h, true));
  if (cards.length === 0 && fast.length === 0 && plays.length === 0 && mine.length === 0) {
    push(game, { ...step, choice: undefined, asked: [...asked, who] });
    return;
  }
  const opts = [
    {
      id: "done",
      label:
        who === t.inv ? `Done (value ${testValue(game, t)} vs ${difficultyOf(game, t)})` : "Done",
      value: "done",
    },
    ...cards.map((h) => ({
      id: h,
      label: `Commit ${def(game, h).name} (+${iconsFor(game, h, testedSkill(game, t))})`,
      card: h,
      value: { commit: h },
    })),
    ...plays.map((h) => ({
      id: `play:${h}`,
      label: `Play ${def(game, h).name} (fast)`,
      card: h,
      value: { play: h },
    })),
    ...fast.map((r) => ({
      id: `${r.card}:${r.index}`,
      label: r.ability.label ?? `Use ${def(game, r.card).name}`,
      card: r.card,
      value: { ability: r },
    })),
    // cards committed in this window can be taken back until Done
    ...mine.map((c) => ({
      id: `un:${c}`,
      label: `Take back ${def(game, c).name}`,
      card: c,
      value: { uncommit: c },
    })),
  ];
  const pick = ask<
    | "done"
    | { commit: InstId }
    | { uncommit: InstId }
    | { play: InstId }
    | { ability: { card: InstId; index: number } }
  >(
    game,
    step,
    who,
    CHOICE.Commit,
    `${me.name}: commit cards to ${invName(game, t.inv)}'s ${t.skill} test`,
    opts,
    { key: who === t.inv ? "commit" : "commitOther", vars: { by: t.inv, skill: t.skill } },
  );
  if (pick === undefined) return;
  if (pick === "done") {
    push(game, { ...step, choice: undefined, asked: [...asked, who] });
    return;
  }
  if ("commit" in pick) {
    moveCard(game, pick.commit, ZONE.Commit);
    setController(game, pick.commit, who);
    t.committed.push(pick.commit);
    t.committers.push(who);
    emit(game, EVENT.Commit, `${me.name} commits ${def(game, pick.commit).name}`, {
      inv: who,
      card: pick.commit,
    });
    // an additional cost to commit it (Soul Link)
    const horror = def(game, pick.commit).commitHorror;
    if (horror) {
      push(
        game,
        {
          t: STEP.AssignDamage,
          inv: who,
          damage: 0,
          horror,
          direct: false,
          source: pick.commit,
        },
        { ...step, choice: undefined },
      );
      return;
    }
  } else if ("uncommit" in pick) {
    const k = t.committed.indexOf(pick.uncommit);
    t.committed.splice(k, 1);
    t.committers.splice(k, 1);
    moveCard(game, pick.uncommit, ZONE.Hand);
    emit(game, EVENT.Uncommit, `${me.name} takes back ${def(game, pick.uncommit).name}`, {
      inv: who,
      card: pick.uncommit,
    });
  } else if ("play" in pick) {
    // the card is paid for and resolves, then the window asks again
    push(game, { t: STEP.PlayCard, inv: who, card: pick.play }, { ...step, choice: undefined });
    return;
  } else {
    // the ability resolves first (its bonus and cost), then the window asks again
    push(
      game,
      { t: STEP.UseAbility, inv: who, card: pick.ability.card, index: pick.ability.index },
      { ...step, choice: undefined },
    );
    return;
  }
  push(game, { ...step, choice: undefined });
}

function revealStage(game: GameContext, step: Extract<Step, { t: "Test" }>) {
  const t = test(game);
  if (t.tokens.length === 0 && (t.autoSucceed || t.autoFail)) {
    // a result known before the reveal skips the chaos token (Grimoire, Automatic Failure/Success)
    emit(game, EVENT.NoToken, "No chaos token is revealed", { inv: t.inv });
    push(game, { t: STEP.Test, stage: TEST_STAGE.Result });
    return;
  }
  if (hasFlag(game, t.inv, "noChaosTokens")) {
    emit(game, EVENT.NoToken, "No chaos token is revealed", { inv: t.inv });
    push(game, { t: STEP.Test, stage: TEST_STAGE.Result });
    return;
  }
  if (!t.drawn) {
    // "when you would reveal a chaos token" (Grotesque Statue): once per reveal
    if (t.revealAsked !== t.tokens.length) {
      t.revealAsked = t.tokens.length;
      push(game, win("wouldRevealToken", { inv: t.inv, testId: t.id }), {
        t: STEP.Test,
        stage: TEST_STAGE.Reveal,
      });
      return;
    }
    if (game.s.chaosBag.length === 0) throw new Error("chaos bag is empty");
    const n = 1 + (t.extraReveal ?? 0);
    t.extraReveal = 0;
    t.drawn = [];
    for (let k = 0; k < n && game.s.chaosBag.length; k++)
      t.drawn.push(...game.s.chaosBag.splice(randInt(game.s, game.s.chaosBag.length), 1));
  }
  let token = t.drawn[0];
  if (t.drawn.length > 1) {
    const drawn = t.drawn;
    const k = ask<number>(
      game,
      step,
      t.inv,
      CHOICE.Generic,
      `Choose a chaos token to resolve (${drawn.join(", ")})`,
      drawn.map((x, i) => ({ id: String(i), label: `Resolve ${x}`, value: i })),
      { key: "chooseToken" },
    );
    if (k === undefined) return;
    token = drawn[k];
    (t.ignored ??= []).push(...drawn.filter((_, i) => i !== k));
    emit(
      game,
      EVENT.TokenIgnored,
      `Ignored chaos token: ${drawn.filter((_, i) => i !== k).join(", ")}`,
      {
        inv: t.inv,
      },
    );
    if (t.onChoose)
      push(game, {
        t: STEP.Script,
        code: t.onChoose.code,
        fn: t.onChoose.fn,
        ctx: { you: t.inv, token },
      });
    t.onChoose = undefined;
  }
  t.drawn = undefined;
  t.tokens.push(token);
  // what is being tested travels with the token, so the draw can show it after the test has already resolved
  const p = testParts(game, t);
  emit(game, EVENT.Token, `Revealed chaos token: ${token}`, {
    inv: t.inv,
    card: t.target ?? t.source ?? null,
    data: {
      token,
      testId: t.id,
      skill: t.skill,
      kind: t.kind,
      value: p.total,
      difficulty: p.difficulty,
    },
  });
  const key = `tok:${t.id}:${game.s.seq++}`;
  t.tokenKey = key;
  push(game, win("tokenRevealed", { inv: t.inv, token, key, testId: t.id }), {
    t: STEP.Test,
    stage: TEST_STAGE.AfterReveal,
  });
}

function afterRevealStage(game: GameContext) {
  const t = test(game);
  const idx = t.tokens.length - 1;
  if (t.tokenKey && game.s.cancelled.includes(t.tokenKey)) {
    const [tok] = t.tokens.splice(idx, 1);
    game.s.chaosBag.push(tok);
    emit(game, EVENT.TokenCancelled, `${tok} is cancelled and returned to the bag`, { inv: t.inv });
    push(game, { t: STEP.Test, stage: TEST_STAGE.Reveal });
    return;
  }
  push(game, { t: STEP.Test, stage: TEST_STAGE.ResolveTokens });
}

function resolveTokensStage(game: GameContext) {
  const t = test(game);
  const scen = game.db.scenarios[game.s.scenarioId];
  const ctx: EffCtx = {
    ...t.ctx,
    you: t.inv,
    inv: t.inv,
    testId: t.id,
    enemy: t.kind !== "investigate" ? t.target : t.ctx.enemy,
  };
  let revealAnother = false;
  while (t.resolvedTokens < t.tokens.length) {
    const token = t.tokens[t.resolvedTokens++];
    let mod = 0;
    if (/^[+-]?\d+$/.test(token)) mod = Number(token);
    else if (token === "autoFail") t.autoFail = true;
    else if (token === "elderSign" && hasFlag(game, t.inv, "elderSignIsAutoFail"))
      t.autoFail = true;
    else if (token === "elderSign") {
      const invCard = inv(game, t.inv).cardId;
      const es = abilitiesOf(game, invCard).find((a) => a.kind === "elderSign");
      if (es) {
        const v = es.tokenValue ?? 0;
        mod =
          v === "cluesOnLocation"
            ? (cardIf(game, inv(game, t.inv).location)?.clues ?? 0)
            : v === "horrorOnYou"
              ? inv(game, t.inv).horror
              : v;
        if (es.effects) t.tokenOnSuccess.push(...es.effects);
        // runs now so it can adjust the current test (auto-succeed, extra on-success effects)
        const code = card(game, invCard).code;
        const fn = es.run ? scriptOf(game.db, code)?.fns?.[es.run] : undefined;
        if (fn)
          runScript(
            game,
            { t: STEP.Script, code, fn: es.run!, ctx: { ...ctx, source: invCard } },
            { fn, direct: true },
          );
      }
    } else {
      const eff = scen.tokens[game.s.difficulty]?.[token as SymbolToken];
      if (eff) {
        mod =
          eff.modifier === "X"
            ? -(tokenX(game, eff.x!, t.inv) * (eff.xTimes ?? 1) + (eff.xPlus ?? 0))
            : eff.modifier;
        const condOk = !eff.condition || checkCondition(game, eff.condition, ctx);
        if (condOk && eff.onReveal)
          push(game, { t: STEP.Effects, effects: eff.onReveal, ctx: { ...ctx, token } });
        if (condOk && eff.onFail) t.tokenOnFail.push(...eff.onFail);
        if (eff.revealAnother === true) revealAnother = true;
        if (
          typeof eff.revealAnother === "object" &&
          checkCondition(game, eff.revealAnother.if, ctx)
        )
          revealAnother = true;
        if (
          eff.revealAnother === "ifAncientOneInPlay" &&
          allCards(game).some(
            (c) => c.zone === "enemy" && def(game, c.id).traits.includes("Ancient One"),
          )
        )
          revealAnother = true;
      }
    }
    t.tokenMods.push(mod);
  }
  if (revealAnother) {
    push(game, { t: STEP.Test, stage: TEST_STAGE.Reveal });
    return;
  }
  push(game, { t: STEP.Test, stage: TEST_STAGE.Result });
}

export function tokenTotal(game: GameContext, t: SkillTestState): number {
  const double = t.kind === "evade" && t.target && hasFlag(game, t.target, "doubleNegativeTokens");
  return t.tokenMods.reduce((n, m) => {
    let v = m;
    if (v < 0 && double) v *= 2;
    if (v < 0 && t.flipNegative) v = -v;
    return n + v;
  }, 0);
}

function resultStage(game: GameContext, step: Extract<Step, { t: "Test" }>) {
  const t = test(game);
  // a card committed after the reveal (Timely Intervention): asked once, before the result
  if (!t.lateAsked) {
    const late = inv(game, t.inv).hand.filter(
      (h) => def(game, h).commitAfterReveal && canCommit(game, t.inv, h, t),
    );
    if (late.length) {
      const pick = ask<InstId | "none">(
        game,
        step,
        t.inv,
        CHOICE.Commit,
        `${invName(game, t.inv)}: commit a card after the reveal?`,
        [
          { id: "none", label: "Done", value: "none" },
          ...late.map((h) => ({
            id: h,
            label: `Commit ${def(game, h).name} (+${iconsFor(game, h, testedSkill(game, t))})`,
            card: h,
            value: h,
          })),
        ],
        { key: "commit", vars: { by: t.inv, skill: t.skill } },
      );
      if (pick === undefined) return;
      if (pick !== "none") {
        moveCard(game, pick, ZONE.Commit);
        setController(game, pick, t.inv);
        t.committed.push(pick);
        t.committers.push(t.inv);
        emit(game, EVENT.Commit, `${invName(game, t.inv)} commits ${def(game, pick).name}`, {
          inv: t.inv,
          card: pick,
        });
      }
    }
    t.lateAsked = true;
  }
  const value = testValue(game, t);
  const tokens = tokenTotal(game, t);
  const total = Math.max(0, value + tokens);
  const diff = difficultyOf(game, t);
  const success = t.autoSucceed || (!t.autoFail && total >= diff);
  if (!success && !t.failWindowDone) {
    t.failWindowDone = true;
    push(
      game,
      win("wouldFailSkillTest", {
        inv: t.inv,
        testId: t.id,
        margin: total - diff,
        key: `fail:${t.id}`,
      }),
      { t: STEP.Test, stage: TEST_STAGE.Result },
    );
    return;
  }
  t.value = value;
  t.total = total;
  t.success = success;
  // an automatic failure counts the skill value as 0, an automatic success the difficulty as 0 (Grimoire, ST.6)
  t.margin = t.autoSucceed ? total : t.autoFail ? -diff : total - diff;
  const tokText = t.tokens.length ? t.tokens.join(", ") : "none";
  const skill = testedSkill(game, t);
  const icons = t.committed.reduce((n, c) => n + iconsFor(game, c, skill), 0);
  const base = value - icons;
  emit(
    game,
    EVENT.TestResult,
    `${invName(game, t.inv)}: ${base}${icons ? ` + ${icons} (committed)` : ""} ${tokens >= 0 ? "+" : "−"} ${Math.abs(tokens)} (${tokText}) = ${total} vs ${diff} → ${success ? "Success" : "Fail"}${t.autoFail ? " (auto-fail)" : ""}${t.autoSucceed ? " (auto-success)" : ""}`,
    {
      inv: t.inv,
      data: {
        skill: t.skill,
        base,
        icons,
        value,
        tokens: t.tokens,
        tokenMods: [...t.tokenMods],
        tokenTotal: tokens,
        total,
        difficulty: diff,
        success,
        testId: t.id,
      },
    },
  );
  push(game, { t: STEP.Test, stage: TEST_STAGE.Apply });
}

function applyStage(game: GameContext) {
  const t = test(game);
  const ok = !!t.success;
  const failBy = ok ? undefined : Math.max(0, -(t.margin ?? 0));
  const ctx: EffCtx = {
    ...t.ctx,
    you: t.ctx.you ?? t.inv,
    inv: t.ctx.inv ?? t.inv,
    testId: t.id,
    failBy,
    succeedBy: ok ? t.margin : undefined,
    enemy: t.kind === "fight" || t.kind === "evade" ? t.target : t.ctx.enemy,
    location: t.kind === "investigate" ? t.target : t.ctx.location,
  };
  const steps: Step[] = [];
  // committed skill cards' own text; a committed asset or event only lends its icons (Grimoire, Skill Icons)
  for (const c of t.committed) {
    if (def(game, c).type !== "skill") continue;
    for (const a of abilitiesOf(game, c)) {
      if (a.kind !== "onPlay") continue;
      const cctx = { ...ctx, source: c, you: card(game, c).owner ?? t.inv };
      if (a.condition && !checkCondition(game, a.condition, cctx)) continue;
      if (a.run) steps.push({ t: STEP.Script, code: card(game, c).code, fn: a.run, ctx: cctx });
      else if (a.effects) steps.push({ t: STEP.Effects, effects: a.effects, ctx: cctx });
    }
  }
  steps.push({ t: STEP.Test, stage: TEST_STAGE.KindResult });
  const list = ok ? t.onSuccess : t.onFail;
  if (list?.length) steps.push({ t: STEP.Effects, effects: list, ctx });
  if (!ok && t.perPointFailed?.length)
    for (let k = 0; k < failBy!; k++)
      steps.push({ t: STEP.Effects, effects: t.perPointFailed, ctx });
  if (!ok && t.tokenOnFail.length) steps.push({ t: STEP.Effects, effects: t.tokenOnFail, ctx });
  if (ok && t.tokenOnSuccess.length)
    steps.push({ t: STEP.Effects, effects: t.tokenOnSuccess, ctx });
  if (t.onTokens && t.tokens.some((x) => t.onTokens!.tokens.includes(x)))
    steps.push({ t: STEP.Effects, effects: t.onTokens.effects, ctx });
  if (t.after) steps.push({ t: STEP.Script, code: t.after.code, fn: t.after.fn, ctx });
  if (ok) {
    if (t.kind === "investigate")
      steps.push(
        win("successfulInvestigate", {
          inv: t.inv,
          location: null,
          margin: t.margin,
          testId: t.id,
        }),
      );
    if (t.kind === "fight")
      steps.push(win("successfulAttack", { inv: t.inv, margin: t.margin, testId: t.id }));
    steps.push(win("skillTestSucceeded", { inv: t.inv, margin: t.margin, testId: t.id }));
  } else steps.push(win("skillTestFailed", { inv: t.inv, margin: t.margin, testId: t.id }));
  steps.push({ t: STEP.Test, stage: TEST_STAGE.End });
  push(game, ...steps);
}

/** an attack's standard damage, or what its margin makes it (Shotgun, Winchester Model 12) */
function marginDamage(t: SkillTestState): number {
  const m = t.damagePerMargin;
  if (!m) return 1;
  const by = t.margin ?? 0;
  return m.instead ? Math.min(m.max, Math.max(1, by)) : 1 + Math.min(m.max, Math.max(0, by));
}

function kindResultStage(game: GameContext, step: Extract<Step, { t: "Test" }>) {
  const t = test(game);
  // after a success, before its damage or clues: the test's source may be paid for more (Sledgehammer)
  if (t.success && t.boost && !t.boostDone) {
    const src = t.source;
    if (src && cardOfIf(game.s, src) && canPay(game, t.inv, src, t.boost.cost)) {
      const yes = ask<boolean>(
        game,
        step,
        t.inv,
        CHOICE.Generic,
        `${def(game, src).name}: pay for more?`,
        [
          {
            id: "yes",
            label: `Use ${def(game, src).name}`,
            value: true,
            key: "option.boost",
            vars: { code: card(game, src).code },
          },
          { id: "no", label: "No", value: false, key: "option.boostNo" },
        ],
        { key: "testBoost", vars: { card: src } },
      );
      if (yes === undefined) return;
      t.boostDone = true;
      if (yes) {
        t.damageBonus += t.boost.damage ?? 0;
        t.boostClues = t.boost.clues ?? 0;
        push(
          game,
          ...payCost(game, t.inv, src, t.boost.cost),
          { t: STEP.Test, stage: TEST_STAGE.KindResult },
          ...(t.boost.effects?.length
            ? [{ t: "Effects" as const, effects: t.boost.effects, ctx: { ...t.ctx, you: t.inv } }]
            : []),
        );
        return;
      }
    }
    t.boostDone = true;
  }
  const steps: Step[] = [];
  if (t.success) {
    if (t.kind === "investigate" && t.target) {
      if (t.insteadOfClues)
        steps.push({
          t: STEP.Effects,
          effects: t.insteadOfClues,
          ctx: { ...t.ctx, you: t.inv, location: t.target },
        });
      else
        steps.push({
          t: STEP.DiscoverClues,
          inv: t.inv,
          location: t.target,
          n: 1 + modSum(game, t.inv, "clueBonus") + (t.boostClues ?? 0),
        });
      steps.push(win("locationInvestigated", { location: t.target, inv: null }));
    }
    if (t.kind === "fight" && t.target) {
      steps.push({
        t: STEP.DamageEnemy,
        enemy: t.target,
        amount:
          marginDamage(t) +
          t.damageBonus +
          modSum(game, t.inv, "attackDamage") +
          (t.marginDamage !== undefined && (t.margin ?? 0) >= t.marginDamage ? 1 : 0),
        by: t.inv,
        attack: true,
        source: t.source,
      });
      // "if this attack defeats an enemy" (Decisive Strike)
      if (t.onDefeat?.length)
        steps.push({
          t: STEP.Effects,
          effects: [
            {
              op: "chooseOne",
              options: [
                { label: "", condition: { not: { eventEnemyInPlay: true } }, effects: t.onDefeat },
              ],
            },
          ],
          ctx: { ...t.ctx, you: t.inv, enemy: t.target },
        });
    }
    if (t.kind === "evade" && t.target) {
      const e = cardOfIf(game.s, t.target);
      if (e?.zone === "enemy") {
        exhaust(game, e.id);
        setEngaged(game, e.id, null);
        emit(game, EVENT.Evade, `${invName(game, t.inv)} evades ${def(game, t.target).name}`, {
          inv: t.inv,
          card: t.target,
        });
        steps.push(
          win("enemyEvaded", { inv: t.inv, enemy: t.target }),
          win("successfulEvade", { inv: t.inv, enemy: t.target }),
        );
      }
    }
  }
  if (!t.success && t.target && (t.kind === "fight" || t.kind === "evade")) {
    const e = cardOfIf(game.s, t.target);
    // the attack's damage goes to the one other investigator the enemy is engaged with (Grimoire, Fight Action)
    if (
      t.kind === "fight" &&
      e?.zone === "enemy" &&
      e.engagedWith &&
      e.engagedWith !== t.inv &&
      !isMassive(game, t.target) &&
      inv(game, e.engagedWith).status === "playing"
    ) {
      steps.push({
        t: STEP.AssignDamage,
        inv: e.engagedWith,
        damage: t.damagePerMargin
          ? Math.min(
              t.damagePerMargin.failMax ?? t.damagePerMargin.max,
              Math.max(1, -(t.margin ?? 0)),
            )
          : enemyStat(game, t.target, "damage"),
        horror: 0,
        direct: false,
        source: t.target,
      });
    }
    const kw = t.kind === "fight" ? "retaliate" : "alert";
    if (e?.zone === "enemy" && !e.exhausted && def(game, t.target).keywords.includes(kw)) {
      emit(
        game,
        kw,
        `${def(game, t.target).name} ${kw === "retaliate" ? "retaliates" : "is alert"}!`,
        {
          card: t.target,
        },
      );
      steps.push({
        t: STEP.EnemyAttack,
        enemy: t.target,
        inv: t.inv,
        aoo: true,
        key: attackKey(game),
      });
    }
  }
  // a ready elusive enemy slips away after it is attacked (after a retaliate attack, which slips it away itself)
  const attacked = t.kind === "fight" && t.target ? cardOfIf(game.s, t.target) : undefined;
  if (
    attacked?.zone === "enemy" &&
    !attacked.exhausted &&
    def(game, t.target!).keywords.includes("elusive")
  )
    steps.push({ t: STEP.Script, code: "__engine", fn: "elusive", ctx: { enemy: t.target } });
  push(game, ...steps);
}

function endStage(game: GameContext) {
  const t = test(game);
  for (const c of t.committed)
    if (cardOfIf(game.s, c)?.zone === "commit") moveCard(game, c, ZONE.Discard);
  game.s.chaosBag.push(...t.tokens, ...(t.ignored ?? []));
  expireMods(game, "test");
  game.s.skillTest = game.s.testStack.pop() ?? null;
  peril.clear(game);
  push(game, win("skillTestEnds", { inv: t.inv, testId: t.id }));
}

export const testHandler: Handler<"Test"> = (game, step) => {
  switch (step.stage) {
    case "commit":
      return commitStage(game, step);
    case "reveal":
      return revealStage(game, step);
    case "afterReveal":
      return afterRevealStage(game);
    case "resolveTokens":
      return resolveTokensStage(game);
    case "result":
      return resultStage(game, step);
    case "apply":
      return applyStage(game);
    case "kindResult":
      return kindResultStage(game, step);
    case "end":
      return endStage(game);
  }
};

export const handlers = { Test: testHandler };
