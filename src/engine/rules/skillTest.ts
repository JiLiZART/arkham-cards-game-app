import {
  commitSpent,
  deckDiscarded,
  gainedIcons,
  noEngage,
  peril,
  returnAfterTest,
} from "../world/flags";
import type {
  Boost,
  ChaosToken,
  Condition,
  Effect,
  Skill,
  SymbolToken,
} from "../../content/schema";
import { randInt } from "../world/rng";
import {
  abilitiesOf,
  allMods,
  baseSkill,
  cardBlocked,
  checkCondition,
  controlled,
  enemyStat,
  expireMods,
  hasFlag,
  invsAt,
  isMassive,
  modSum,
  shroud,
  tokenHolder,
} from "../queries";
import {
  activeInvs,
  addCounter,
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
  tokensOn,
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
  onTokens?: { tokens: string[]; effects: Effect[]; after?: boolean };
  marginDamage?: number;
  extraDamageIf?: Condition;
  extraDamage?: number;
  damagePerMargin?: { max: number; instead?: boolean; failMax?: number };
  boost?: Boost;
  onDefeat?: Effect[];
  autoSucceed?: boolean;
  baseSkill?: number;
  noDamageToOthersOnFail?: boolean;
  extraClues?: number;
  noEvade?: boolean;
  evadeNoExhaust?: boolean;
  noEngageAfterEvade?: boolean;
  retaliate?: "gain" | "ignore";
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
/** the token just revealed is ignored: set aside until the test ends, another one revealed in its place (Lucky Dice) */
export function ignoreToken(game: GameContext) {
  const t = game.s.skillTest;
  if (t?.tokens.length) t.ignoreLast = true;
}
/** the effects of a symbol, its modifier included, are ignored for the rest of the test (Defiance) */
export function ignoreSymbol(game: GameContext, token: ChaosToken) {
  const t = game.s.skillTest;
  if (t) (t.ignoredSymbols ??= []).push(token);
}
/** steps that run once the test has ended, in the order given ("after it resolves": Quick Thinking) */
export function afterTest(game: GameContext, steps: Step[]) {
  const t = game.s.skillTest;
  if (t) t.afterEnd = [...(t.afterEnd ?? []), ...steps];
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
    ...(o.extraDamageIf ? { extraDamageIf: o.extraDamageIf, extraDamage: o.extraDamage } : {}),
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
    ...(o.baseSkill !== undefined ? { baseSkill: o.baseSkill } : {}),
    ...(o.noDamageToOthersOnFail ? { noDamageToOthersOnFail: true } : {}),
    ...(o.extraClues ? { extraClues: o.extraClues } : {}),
    ...(o.noEvade ? { noEvade: true } : {}),
    ...(o.evadeNoExhaust ? { evadeNoExhaust: true } : {}),
    ...(o.noEngageAfterEvade ? { noEngageAfterEvade: true } : {}),
    ...(o.retaliate ? { retaliate: o.retaliate } : {}),
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
  const d =
    t.kind === "investigate" && t.target
      ? Math.max(0, shroud(game, t.target) + t.shroudMod)
      : t.kind === "fight" && t.target
        ? enemyStat(game, t.target, "fight")
        : t.kind === "evade" && t.target
          ? enemyStat(game, t.target, "evade")
          : t.difficulty;
  // the tester's modifiers to the difficulty (Fine Clothes: -2 during a parley)
  const mod = modSum(game, t.inv, "difficulty");
  // a committed card that changes the difficulty while it is committed (Double or Nothing doubles it)
  return t.committed.reduce(
    (n, c) => {
      const f = cancelledSkill(game, c)
        ? undefined
        : scriptOf(game.db, card(game, c).code)?.difficulty;
      return f ? f(game, c, n) : n;
    },
    mod ? Math.max(0, d + mod) : d,
  );
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

/** a skill card committed to the current test whose effects and icons a token cancelled (Where Doom Awaits' cultist) */
const cancelledSkill = (game: GameContext, cardId: InstId) => {
  const t = game.s.skillTest;
  return (
    !!t?.committedCancelled && t.committed.includes(cardId) && def(game, cardId).type === "skill"
  );
};

/** icons a card contributes to a test */
export function iconsFor(game: GameContext, cardId: InstId, skill: Skill): number {
  const d = def(game, cardId);
  if (cancelledSkill(game, cardId)) return 0;
  const extra = scriptOf(game.db, d.code)?.icons?.(game, cardId) ?? {};
  // committed (or offered) to a test another investigator performs (Leadership)
  const t = game.s.skillTest;
  const other = d.iconsOnOthersTest && t && card(game, cardId).owner !== t.inv;
  const more = other ? d.iconsOnOthersTest! : {};
  // icons an effect gave it until the end of the test (Minh Thi Phan)
  const gained = gainedIcons.get(game, cardId) ?? {};
  return (
    (d.icons[skill] ?? 0) +
    (d.icons.wild ?? 0) +
    (extra[skill] ?? 0) +
    (extra.wild ?? 0) +
    (more[skill] ?? 0) +
    (more.wild ?? 0) +
    (gained[skill] ?? 0) +
    (gained.wild ?? 0)
  );
}

export function canCommit(
  game: GameContext,
  who: InvId,
  cardId: InstId,
  t: SkillTestState,
): boolean {
  const d = def(game, cardId);
  if (d.commitAutoFails) return !cardBlocked(game, who, cardId);
  if (d.subtype) return false;
  // under Mind over Matter either skill may end up tested, so icons for either count
  const mom =
    (t.skill === "combat" || t.skill === "agility") &&
    hasFlag(game, t.inv, "intellectForCombatAndAgility");
  if (iconsFor(game, cardId, t.skill) === 0 && !(mom && iconsFor(game, cardId, "intellect") > 0))
    return false;
  if (d.commitOnlyOwnTest && who !== t.inv) return false;
  if (d.commitIf && !checkCondition(game, d.commitIf, { you: who, source: cardId })) return false;
  // "only if the difficulty of that test is at least 2 higher than your base skill value" (Rise to the Occasion)
  if (
    d.commitDifficultyOverBase !== undefined &&
    difficultyOf(game, t) - (t.baseSkill ?? baseSkill(game, who, t.skill)) <
      d.commitDifficultyOverBase
  )
    return false;
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
  // "you attack with a base [combat] skill of 4" (Duke): that value in place of the investigator's, modifiers still apply
  const base =
    t.baseSkill !== undefined && skill === t.skill
      ? Math.max(0, t.baseSkill + modSum(game, t.inv, skill))
      : ownSkill(game, t.inv, skill);
  const icons = t.committed.map((c) => ({ card: c, n: iconsFor(game, c, skill) }));
  const mods = t.skillBonus + modSum(game, t.inv, "testValue");
  const total = base + icons.reduce((n, i) => n + i.n, 0) + mods;
  // "your [intellect] cannot be increased" (Historical Museum): no more than the base value
  const capped = allMods(game).some(
    (m) =>
      m.target === t.inv &&
      m.mod.flag === "skillCannotIncrease" &&
      m.mod.stat === skill &&
      hasFlag(game, t.inv, "skillCannotIncrease", [m]),
  );
  return {
    base,
    icons,
    mods,
    total: capped ? Math.min(total, baseSkill(game, t.inv, skill)) : total,
    difficulty: difficultyOf(game, t),
  };
}

/** current skill value without tokens */
export const testValue = (game: GameContext, t: SkillTestState): number => testParts(game, t).total;

/**
 * a committed card's additional cost ("spend up to 3 resources": "Watch this!"; "up to 3 charges from among assets you
 * control": Torrent of Power), one point a choice until the player is done or the most is spent
 */
function spendToCommit(game: GameContext, step: Extract<Step, { t: "Test" }>, id: InstId) {
  const cost = def(game, id).commitSpend!;
  const who = card(game, id).controller!;
  const spent = commitSpent.get(game, id) ?? [];
  const from =
    spent.length >= cost.max
      ? []
      : cost.of === "resources"
        ? inv(game, who).resources > 0
          ? ["resources"]
          : []
        : controlled(game, who)
            .filter((c) => def(game, c.id).uses?.type === "charges" && c.uses > 0)
            .map((c) => c.id);
  if (!from.length) return;
  const pick = ask<string>(
    game,
    step,
    who,
    CHOICE.Generic,
    `${def(game, id).name}: spend ${cost.of === "resources" ? "a resource" : "a charge"}? (${spent.length} spent)`,
    [
      { id: "done", label: "Done", value: "done", key: "option.done" },
      ...from.map((f) =>
        f === "resources"
          ? { id: f, label: "Spend 1 resource", value: f, key: "option.spendResource" }
          : {
              id: f,
              label: `Spend 1 charge from ${def(game, f).name}`,
              card: f,
              value: f,
              key: "option.spendCharge",
              vars: { card: f },
            },
      ),
    ],
    { key: "commitSpend", vars: { card: id, n: spent.length } },
  );
  if (pick === undefined || pick === "done") return;
  addCounter(
    game,
    pick === "resources" ? who : pick,
    pick === "resources" ? "resources" : "uses",
    -1,
  );
  commitSpent.set(game, id, [...spent, pick]);
  if (cost.icons) {
    const has = gainedIcons.get(game, id) ?? {};
    const more = { ...has };
    for (const [k, n] of Object.entries(cost.icons) as [Skill | "wild", number][])
      more[k] = (more[k] ?? 0) + n;
    gainedIcons.set(game, id, more);
  }
  push(game, { ...step, choice: undefined });
}

/** what a card taken back was paid with goes back where it came from */
function refundCommit(game: GameContext, id: InstId, who: InvId) {
  for (const f of commitSpent.take(game, id) ?? [])
    if (f === "resources") addCounter(game, who, "resources", 1);
    else if (cardIf(game, f)?.zone === ZONE.Play) addCounter(game, f, "uses", 1);
  gainedIcons.clear(game, id);
}

function commitStage(game: GameContext, step: Extract<Step, { t: "Test" }>) {
  if (step.spending) return spendToCommit(game, step, step.spending);
  const t = test(game);
  const asked = step.asked ?? [];
  const perilous = !!peril.get(game);
  const loc = inv(game, t.inv).location;
  const here = invsAt(game, loc);
  // an investigator elsewhere who may commit to tests at other locations (Analytical Mind)
  const afar = activeInvs(game).filter(
    (i) => !here.includes(i) && hasFlag(game, i, "commitFromAfar"),
  );
  const order = [t.inv, ...(perilous ? [] : [...here, ...afar].filter((i) => i !== t.inv))];
  const who = order.find((i) => !asked.includes(i));
  if (!who) {
    push(game, { t: STEP.Test, stage: TEST_STAGE.Reveal });
    return;
  }
  const me = inv(game, who);
  const mine = t.committed.filter((c, k) => t.committers[k] === who);
  // "you cannot commit exactly 1 or 2 cards to a skill test" (The King in Yellow)
  const notOneOrTwo = hasFlag(game, who, "cannotCommitOneOrTwo");
  // another investigator at the location commits at most one card (Grimoire, ST.2); they may still take it back
  const cards =
    who !== t.inv && (mine.length >= 1 || notOneOrTwo)
      ? []
      : me.hand.filter((h) => canCommit(game, who, h, t));
  // a player window: any [fast] ability, and fast cards playable now (Grimoire, ST.1)
  const fast = activatable(game, who, ["fast"]);
  const plays = playable(game, who).filter((h) => canPlay(game, who, h, true));
  if (cards.length === 0 && fast.length === 0 && plays.length === 0 && mine.length === 0) {
    push(game, { ...step, choice: undefined, asked: [...asked, who] });
    return;
  }
  const canFinish = !notOneOrTwo || mine.length === 0 || mine.length > 2;
  const opts = [
    ...(canFinish
      ? [
          {
            id: "done",
            label:
              who === t.inv
                ? `Done (value ${testValue(game, t)} vs ${difficultyOf(game, t)})`
                : "Done",
            value: "done",
          },
        ]
      : []),
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
    push(
      game,
      // "after you commit exactly 1 card to a skill test" (Analytical Mind)
      ...(mine.length
        ? [win("cardsCommitted", { inv: who, amount: mine.length, testId: t.id })]
        : []),
      { ...step, choice: undefined, asked: [...asked, who] },
    );
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
    // an additional cost to commit it (Soul Link; "Watch this!")
    const horror = def(game, pick.commit).commitHorror;
    push(
      game,
      ...(def(game, pick.commit).commitSpend
        ? [{ t: STEP.Test, stage: TEST_STAGE.Commit, spending: pick.commit } as Step]
        : []),
      ...(horror
        ? [
            {
              t: STEP.AssignDamage,
              inv: who,
              damage: 0,
              horror,
              direct: false,
              source: pick.commit,
            } as Step,
          ]
        : []),
      // "after an investigator … commits a card to a skill test" (Minh Thi Phan)
      win("cardCommitted", { inv: who, card: pick.commit, testId: t.id }),
      { ...step, choice: undefined },
    );
    return;
  } else if ("uncommit" in pick) {
    const k = t.committed.indexOf(pick.uncommit);
    t.committed.splice(k, 1);
    t.committers.splice(k, 1);
    refundCommit(game, pick.uncommit, who);
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
  // "Do not reveal chaos tokens from the chaos bag for this test. Treat the chaos token revealed … as an [elder_sign]"
  // (Seal of the Elder Sign): the token comes from the card, not the bag, and never goes into it
  const seal = t.committed.find((c) => def(game, c).sealsToken);
  if (!t.drawn && seal && !t.sealed) {
    t.sealed = def(game, seal).sealsToken!;
    t.drawn = [t.sealed];
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

function afterRevealStage(game: GameContext, step: Extract<Step, { t: "Test" }>) {
  const t = test(game);
  const idx = t.tokens.length - 1;
  if (t.ignoreLast) {
    t.ignoreLast = false;
    const [tok] = t.tokens.splice(idx, 1);
    if (t.treatAs) delete t.treatAs[idx];
    (t.ignored ??= []).push(tok);
    emit(game, EVENT.TokenIgnored, `Ignored chaos token: ${tok}`, { inv: t.inv });
    push(game, { t: STEP.Test, stage: TEST_STAGE.Reveal });
    return;
  }
  if (t.tokenKey && game.s.cancelled.includes(t.tokenKey)) {
    const [tok] = t.tokens.splice(idx, 1);
    game.s.chaosBag.push(tok);
    if (t.treatAs) delete t.treatAs[idx];
    emit(game, EVENT.TokenCancelled, `${tok} is cancelled and returned to the bag`, { inv: t.inv });
    push(game, { t: STEP.Test, stage: TEST_STAGE.Reveal });
    return;
  }
  // "You may spend N resources to treat this token as a 0, instead" (The House Always Wins' skull)
  const token = t.treatAs?.[idx] ?? t.tokens[idx];
  const eff =
    game.db.scenarios[game.s.scenarioId]?.tokens[game.s.difficulty]?.[token as SymbolToken];
  const n = eff?.payToZero;
  if (n && t.paidToZero?.[idx] === undefined && inv(game, t.inv).resources >= n) {
    const pay = ask<boolean>(
      game,
      step,
      t.inv,
      CHOICE.Generic,
      `Spend ${n} resources to treat ${token} as a 0?`,
      [
        { id: "keep", label: `Keep ${token}`, value: false, key: "option.keepToken" },
        {
          id: "pay",
          label: `Spend ${n} resources: treat it as a 0`,
          value: true,
          key: "option.payToZero",
        },
      ],
      { key: "payToZero", vars: { n, token } },
    );
    if (pay === undefined) return;
    (t.paidToZero ??= {})[idx] = pay;
    if (pay) {
      addCounter(game, t.inv, "resources", -n);
      emit(game, EVENT.Resource, `${invName(game, t.inv)} spends ${n} resources: ${token} is a 0`, {
        inv: t.inv,
        data: { n, lost: true },
      });
    }
  }
  // "You must either remove all clues from a Brood…, or this token's modifier is −4 instead" (Undimensioned and Unseen)
  const either = eff?.either;
  if (either && t.paidToZero?.[idx] !== true && t.eitherDone?.[idx] === undefined) {
    const ctx: EffCtx = {
      ...t.ctx,
      you: t.inv,
      inv: t.inv,
      testId: t.id,
      enemy: t.kind !== "investigate" ? t.target : t.ctx.enemy,
      token,
    };
    const can = !either.can || checkCondition(game, either.can, ctx);
    const done = can
      ? ask<boolean>(
          game,
          step,
          t.inv,
          CHOICE.Generic,
          `${token}: choose one`,
          [
            { id: "do", label: either.label, value: true, key: `option.${either.key}` },
            either.autoFail
              ? {
                  id: "penalty",
                  label: "The test automatically fails",
                  value: false,
                  key: "option.tokenAutoFail",
                }
              : {
                  id: "penalty",
                  label: `${token} is ${either.modifier ?? 0} instead`,
                  value: false,
                  key: "option.tokenModifierInstead",
                  vars: { n: either.modifier ?? 0 },
                },
          ],
          { key: "tokenEither", vars: { token } },
        )
      : false;
    if (done === undefined) return;
    (t.eitherDone ??= {})[idx] = done;
    if (done) {
      push(
        game,
        { t: STEP.Effects, effects: either.do, ctx },
        { t: STEP.Test, stage: TEST_STAGE.ResolveTokens },
      );
      return;
    }
  }
  push(game, { t: STEP.Test, stage: TEST_STAGE.ResolveTokens });
}

/** the token just revealed is treated as another one of the bag (Beginner's Luck) */
export function treatTokenAs(game: GameContext, token: ChaosToken) {
  const t = game.s.skillTest;
  if (!t || !t.tokens.length) return;
  (t.treatAs ??= {})[t.tokens.length - 1] = token;
  emit(game, EVENT.Token, `${t.tokens[t.tokens.length - 1]} is treated as ${token}`, {
    inv: t.inv,
    data: { token },
  });
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
  // each token's unconditional effects, in reveal order: they resolve before the result (Grimoire, ST.4)
  const onReveal: Step[] = [];
  while (t.resolvedTokens < t.tokens.length) {
    const at = t.resolvedTokens++;
    const token = t.treatAs?.[at] ?? t.tokens[at];
    let mod = 0;
    if (t.paidToZero?.[at]) mod = 0;
    else if (/^[+-]?\d+$/.test(token)) mod = Number(token);
    else if (token === "autoFail") t.autoFail = true;
    // Defiance: the chosen symbol does nothing this test, its modifier included
    else if (t.ignoredSymbols?.includes(token) && !t.committedCancelled) mod = 0;
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
              : v === "damageOnYou"
                ? inv(game, t.inv).damage
                : v === "resources"
                  ? inv(game, t.inv).resources
                  : v;
        if (es.effects) t.tokenOnSuccess.push(...es.effects);
        // effects of the elder sign itself, before the result (Pete readies Duke, Rex may fail to draw 3)
        if (es.onReveal)
          onReveal.push({
            t: STEP.Effects,
            effects: es.onReveal,
            ctx: { ...ctx, source: invCard, token },
          });
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
      // "−X. Discard the top 2 cards of your deck. X is …": what it reveals resolves first, then the token comes back here
      const idx = t.resolvedTokens - 1;
      const first = eff?.x === "discardedPrintedCost" && !!eff.onReveal?.length;
      if (first && !t.revealedFirst?.includes(idx)) {
        t.revealedFirst = [...(t.revealedFirst ?? []), idx];
        t.resolvedTokens--;
        push(
          game,
          ...onReveal,
          { t: STEP.Effects, effects: eff.onReveal!, ctx: { ...ctx, token } },
          { t: STEP.Test, stage: TEST_STAGE.ResolveTokens },
        );
        return;
      }
      if (eff) {
        let xv: number | undefined;
        const xOf = () =>
          (xv ??=
            eff.x === "tokensOn" && eff.xTokens
              ? tokensOn(game, tokenHolder(game, eff.xTokens.on, ctx) ?? "", eff.xTokens.name)
              : eff.x === "discardedPrintedCost"
                ? (deckDiscarded.take(game, String(t.id)) ?? []).reduce((n, id) => {
                    const cost = def(game, id).cost;
                    return n + (typeof cost === "number" ? cost : 0);
                  }, 0)
                : tokenX(game, eff.x!, t.inv));
        const x = () =>
          -(
            Math.max(Math.min(xOf(), eff.xMax ?? Infinity), eff.xMin ?? 0) * (eff.xTimes ?? 1) +
            (eff.xPlus ?? 0)
          );
        mod = eff.modifier === "X" ? x() : eff.modifier;
        // "−3 instead if …": the other modifier while its condition holds for the investigator testing
        // "If it is Agenda 2, you automatically fail instead"
        if (eff.instead && checkCondition(game, eff.instead.when, ctx)) {
          if (eff.instead.autoFail) t.autoFail = true;
          else
            mod =
              eff.instead.modifier === undefined || typeof eff.instead.modifier === "number"
                ? (eff.instead.modifier ?? mod)
                : x();
        }
        // "…, or this token's modifier is −4 instead / this test automatically fails": the penalty was taken
        if (eff.either && t.eitherDone?.[at] === false) {
          if (eff.either.modifier !== undefined) mod = eff.either.modifier;
          if (eff.either.autoFail) t.autoFail = true;
        }
        const condOk = !eff.condition || checkCondition(game, eff.condition, ctx);
        if (condOk && eff.onReveal && !first)
          onReveal.push({ t: STEP.Effects, effects: eff.onReveal, ctx: { ...ctx, token } });
        if (condOk && eff.onFail) t.tokenOnFail.push(...eff.onFail);
        if (condOk && eff.onSuccess) t.tokenOnSuccess.push(...eff.onSuccess);
        // "after this skill test, …" (Lost in Time and Space): once the test is over, or only if it failed
        if (condOk && eff.afterTest?.ifFailed)
          t.tokenAfterFail = [...(t.tokenAfterFail ?? []), ...eff.afterTest.effects];
        else if (condOk && eff.afterTest) t.tokenAfter.push(...eff.afterTest.effects);
        if (condOk && eff.cancelCommitted) t.committedCancelled = true;
        // Jim Culver: the skull's modifier is 0, its effects still resolve
        if (token === "skull" && hasFlag(game, t.inv, "skullIsZero")) mod = 0;
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
  push(game, ...onReveal, {
    t: STEP.Test,
    stage: revealAnother ? TEST_STAGE.Reveal : TEST_STAGE.Result,
  });
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
  // the tokens went back to the bag: reveal anew (Rex's Curse)
  if (t.redraw) {
    t.redraw = false;
    push(game, { t: STEP.Test, stage: TEST_STAGE.Reveal });
    return;
  }
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
  // a card committed that makes the test fail (Possession (Traitorous))
  if (t.committed.some((c) => def(game, c).commitAutoFails)) t.autoFail = true;
  const success = t.autoSucceed || (!t.autoFail && total >= diff);
  if (success && !t.succeedWindowDone) {
    t.succeedWindowDone = true;
    push(game, win("wouldSucceedSkillTest", { inv: t.inv, testId: t.id }), {
      t: STEP.Test,
      stage: TEST_STAGE.Result,
    });
    return;
  }
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

/** the context the test's results resolve in */
function applyCtx(t: SkillTestState): EffCtx {
  const ok = !!t.success;
  return {
    ...t.ctx,
    you: t.ctx.you ?? t.inv,
    inv: t.ctx.inv ?? t.inv,
    testId: t.id,
    failBy: ok ? undefined : Math.max(0, -(t.margin ?? 0)),
    succeedBy: ok ? t.margin : undefined,
    enemy: t.kind === "fight" || t.kind === "evade" ? t.target : t.ctx.enemy,
    location: t.kind === "investigate" ? t.target : t.ctx.location,
  };
}

/** the committed skill cards' own text whose condition holds; `again` leaves out `skip` and a modifier for the test */
function committedText(game: GameContext, t: SkillTestState, ctx: EffCtx, again?: InstId): Step[] {
  const steps: Step[] = [];
  // committed skill cards' own text; a committed asset or event only lends its icons (Grimoire, Skill Icons)
  for (const c of t.committed) {
    if (def(game, c).type !== "skill" || cancelledSkill(game, c) || c === again) continue;
    for (const a of abilitiesOf(game, c)) {
      if (a.kind !== "onPlay") continue;
      const cctx = { ...ctx, source: c, you: card(game, c).owner ?? t.inv };
      if (a.condition && !checkCondition(game, a.condition, cctx)) continue;
      if (a.run && !again)
        steps.push({ t: STEP.Script, code: card(game, c).code, fn: a.run, ctx: cctx });
      else if (a.effects) {
        // a modifier for the test already counts in every resolution of it (Deduction's clue, Vicious Blow's damage)
        const effects = again
          ? a.effects.filter((e) => !(e.op === "modify" && e.until === "test"))
          : a.effects;
        if (effects.length) steps.push({ t: STEP.Effects, effects, ctx: cctx });
      }
    }
  }
  return steps;
}

/**
 * The success resolved once more (Double or Nothing, committed as `by`): the action's outcome and every "if this test
 * is successful" effect of the test and of the other committed cards; reactions and token effects only once.
 */
export function repeatSuccess(game: GameContext, by: InstId) {
  const t = game.s.skillTest;
  if (t?.success) t.repeatBy = by;
}

/** the second resolution of a success, once the first one's outcome is under way (`repeatSuccess`) */
function repeatSteps(game: GameContext, t: SkillTestState): Step[] {
  if (!t.success || !t.repeatBy || t.repeated) return [];
  t.repeated = true;
  const ctx = applyCtx(t);
  return [
    ...committedText(game, t, ctx, t.repeatBy),
    { t: STEP.Test, stage: TEST_STAGE.KindResult },
    ...(t.onSuccess?.length ? [{ t: STEP.Effects, effects: t.onSuccess, ctx } as Step] : []),
  ];
}

/**
 * The revealed tokens go back to the bag and new ones are revealed before the result (Rex's Curse): what they did is
 * undone, the test's other numbers stay.
 */
export function redrawTokens(game: GameContext) {
  const t = game.s.skillTest;
  if (!t) return;
  game.s.chaosBag.push(...t.tokens);
  emit(game, EVENT.TokenCancelled, `${t.tokens.join(", ")} go back to the bag`, { inv: t.inv });
  Object.assign(t, {
    tokens: [],
    tokenMods: [],
    resolvedTokens: 0,
    tokenOnFail: [],
    tokenOnSuccess: [],
    tokenAfter: [],
    tokenAfterFail: undefined,
    treatAs: undefined,
    paidToZero: undefined,
    eitherDone: undefined,
    revealedFirst: undefined,
    committedCancelled: undefined,
    autoFail: false,
    revealAsked: undefined,
    redraw: true,
    redrawn: true,
  });
}

function applyStage(game: GameContext) {
  const t = test(game);
  const ok = !!t.success;
  const ctx = applyCtx(t);
  const failBy = ctx.failBy;
  // "after you fail … while attacking": before the failed attack's damage goes to another investigator (Oops! 2)
  const steps: Step[] =
    !ok && t.kind === "fight"
      ? [win("attackFailed", { inv: t.inv, margin: t.margin, testId: t.id })]
      : [];
  steps.push(...committedText(game, t, ctx));
  steps.push({ t: STEP.Test, stage: TEST_STAGE.KindResult });
  const list = ok ? t.onSuccess : t.onFail;
  if (list?.length) steps.push({ t: STEP.Effects, effects: list, ctx });
  if (!ok && t.perPointFailed?.length)
    for (let k = 0; k < failBy!; k++)
      steps.push({ t: STEP.Effects, effects: t.perPointFailed, ctx });
  if (!ok && t.tokenOnFail.length) steps.push({ t: STEP.Effects, effects: t.tokenOnFail, ctx });
  if (ok && t.tokenOnSuccess.length)
    steps.push({ t: STEP.Effects, effects: t.tokenOnSuccess, ctx });
  const tokensHit = !!t.onTokens && t.tokens.some((x) => t.onTokens!.tokens.includes(x));
  if (tokensHit && !t.onTokens!.after)
    steps.push({ t: STEP.Effects, effects: t.onTokens!.effects, ctx });
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
  if (t.tokenAfter.length) steps.push({ t: STEP.Effects, effects: t.tokenAfter, ctx });
  if (!ok && t.tokenAfterFail?.length)
    steps.push({ t: STEP.Effects, effects: t.tokenAfterFail, ctx });
  // "after this test resolves" (Rite of Seeking)
  if (tokensHit && t.onTokens!.after)
    steps.push({ t: STEP.Effects, effects: t.onTokens!.effects, ctx });
  push(game, ...steps);
}

/** an attack's standard damage, or what its margin makes it (Shotgun, Winchester Model 12) */
function marginDamage(t: SkillTestState): number {
  const m = t.damagePerMargin;
  if (!m) return 1;
  const by = t.margin ?? 0;
  return m.instead ? Math.min(m.max, Math.max(1, by)) : 1 + Math.min(m.max, Math.max(0, by));
}

/** the damage an attack deals, with its bonuses and the attacker's modifiers (Oops! deals a failed one's elsewhere) */
export function attackDamage(game: GameContext, t: SkillTestState): number {
  const extra =
    t.extraDamageIf &&
    checkCondition(game, t.extraDamageIf, { ...t.ctx, you: t.inv, enemy: t.target })
      ? (t.extraDamage ?? 1)
      : 0;
  // a penalty can take it to nothing, not below (The Pallid Mask's cultist: "this attack deals no damage")
  return Math.max(
    0,
    marginDamage(t) +
      t.damageBonus +
      extra +
      modSum(game, t.inv, "attackDamage") +
      (t.marginDamage !== undefined && (t.margin ?? 0) >= t.marginDamage ? 1 : 0),
  );
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
  // Double or Nothing: the second resolution follows this one's outcome
  push(game, ...repeatSteps(game, t));
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
          n: 1 + modSum(game, t.inv, "clueBonus") + (t.boostClues ?? 0) + (t.extraClues ?? 0),
        });
      steps.push(win("locationInvestigated", { location: t.target, inv: null }));
    }
    if (t.kind === "fight" && t.target) {
      steps.push({
        t: STEP.DamageEnemy,
        enemy: t.target,
        amount: attackDamage(game, t),
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
    if (t.kind === "evade" && t.target && !t.noEvade) {
      const e = cardOfIf(game.s, t.target);
      if (e?.zone === "enemy") {
        if (!t.evadeNoExhaust) exhaust(game, e.id);
        setEngaged(game, e.id, null);
        // "until the end of your turn, that enemy cannot engage you" (Stealth)
        if (t.noEngageAfterEvade) noEngage.set(game, [e.id, t.inv], game.s.counters.turn);
        emit(game, EVENT.Evade, `${invName(game, t.inv)} evades ${def(game, t.target).name}`, {
          inv: t.inv,
          card: t.target,
        });
        // the margin goes with them: "if you succeeded by 2 or more" (Pickpocketing)
        steps.push(
          win("enemyEvaded", { inv: t.inv, enemy: t.target, margin: t.margin }),
          win("successfulEvade", { inv: t.inv, enemy: t.target, margin: t.margin }),
        );
      }
    }
  }
  if (!t.success && t.target && (t.kind === "fight" || t.kind === "evade")) {
    const e = cardOfIf(game.s, t.target);
    // the attack's damage goes to the one other investigator the enemy is engaged with (Grimoire, Fight Action)
    if (
      t.kind === "fight" &&
      !t.noDamageToOthersOnFail &&
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
    // an attack can give the enemy Retaliate (Knuckleduster) or ignore it (.45 Automatic 2)
    const has =
      kw === "retaliate" && t.retaliate
        ? t.retaliate === "gain"
        : def(game, t.target).keywords.includes(kw);
    if (e?.zone === "enemy" && !e.exhausted && has) {
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
    steps.push({ t: STEP.Elusive, enemy: t.target! });
  push(game, ...steps);
}

function endStage(game: GameContext) {
  const t = test(game);
  for (const c of t.committed) {
    gainedIcons.clear(game, c);
    commitSpent.clear(game, c);
    // "When this test ends, remove Seal of the Elder Sign from the game"
    if (def(game, c).sealsToken && cardOfIf(game.s, c)?.zone === "commit")
      moveCard(game, c, ZONE.Removed);
    // a card an effect returns to its owner's hand once the test ends (Minh Thi Phan's elder sign)
    const back = returnAfterTest.take(game, c) && !!cardOfIf(game.s, c)?.owner;
    if (cardOfIf(game.s, c)?.zone === "commit")
      // an encounter card committed (Possession (Traitorous)) goes to the encounter discard pile
      moveCard(
        game,
        c,
        back ? ZONE.Hand : cardOfIf(game.s, c)?.owner ? ZONE.Discard : ZONE.EncounterDiscard,
      );
  }
  // a sealed test's token was never in the bag (Seal of the Elder Sign)
  const back = [...t.tokens, ...(t.ignored ?? [])];
  if (t.sealed && back.includes(t.sealed)) back.splice(back.indexOf(t.sealed), 1);
  game.s.chaosBag.push(...back);
  expireMods(game, "test");
  // "for the next skill test you perform this phase" (Fieldwork): over once that test is
  game.s.tempMods = game.s.tempMods.filter((m) => !(m.next === "test" && m.target === t.inv));
  // "for the next attack performed against it" (Expose Weakness): over once that attack is
  if (t.kind === "fight" && t.target)
    game.s.tempMods = game.s.tempMods.filter((m) => !(m.nextAttack && m.target === t.target));
  game.s.skillTest = game.s.testStack.pop() ?? null;
  peril.clear(game);
  push(
    game,
    // "after you perform an attack against it using a [[Melee]] card" (Conglomeration of Spheres)
    ...(t.kind === "fight" && t.target
      ? [
          win("enemyFought", {
            inv: t.inv,
            enemy: t.target,
            ...(t.source ? { card: t.source } : {}),
            testId: t.id,
          }),
        ]
      : []),
    win("skillTestEnds", { inv: t.inv, testId: t.id }),
    ...(t.afterEnd ?? []),
  );
}

export const testHandler: Handler<"Test"> = (game, step) => {
  switch (step.stage) {
    case "commit":
      return commitStage(game, step);
    case "reveal":
      return revealStage(game, step);
    case "afterReveal":
      return afterRevealStage(game, step);
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
