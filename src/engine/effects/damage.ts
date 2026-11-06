/** Effects that deal, take, prevent and heal damage and horror. */
import { damageBonus, prevented } from "../world/flags";
import type { Effect } from "../../content/schema";
import {
  addCounter,
  allCards,
  ask,
  card,
  cardIf,
  def,
  emit,
  type GameContext,
  inv,
  invName,
  push,
  ready,
  setCounter,
  setEngaged,
} from "../context";
import { controlled, enemies, invsAt, isElite, matchesFilter } from "../queries";
import { attackKey } from "../rules/enemies";
import { win } from "../rules/cards";
import type { EffCtx, InstId, InvId, Step } from "../world/types";
import { amt, enemyTargets, invTargets } from "./targets";
import type { EffectOf, EffectRun } from "./types";
import { EVENT } from "../events/event";
import { CHOICE } from "../world/constants";
import { STEP } from "../steps/step";
import { fireCardHook } from "../rules/scripts";

/** horror a heal may remove from `target`, after the cards in play that restrict or redirect it (Rational Thought) */
function horrorHealable(
  game: GameContext,
  healer: InvId | null | undefined,
  target: InstId,
  n: number,
): number {
  let left = n;
  for (const c of allCards(game))
    if (c.zone === "threat" || c.zone === "play")
      left =
        fireCardHook(
          game,
          c.code,
          "healHorror",
          { source: c.id, you: c.controller, inv: healer ?? null },
          target,
          left,
        ) ?? left;
  return left;
}

/** "after one of your card effects heals horror" (Carolyn Fern, Hypnotic Therapy) */
const healedWindow = (ctx: EffCtx, healed: InstId, n: number) =>
  win("horrorHealed", { inv: ctx.you ?? null, card: healed, by: ctx.source ?? null, amount: n });

function takeDamageOrHorrorEffect(
  game: GameContext,
  run: EffectRun<EffectOf<"takeDamage" | "takeHorror">>,
) {
  const { step, ctx } = run;
  const e = run.effect;

  const ts = invTargets(game, step, e.target, ctx);
  if (!ts) return;
  const n = amt(game, e.amount, ctx);
  if (n <= 0) return;
  for (const i of ts)
    push(game, {
      t: STEP.AssignDamage,
      inv: i,
      damage: e.op === "takeDamage" ? n : 0,
      horror: e.op === "takeHorror" ? n : 0,
      direct: !!e.direct,
      ...(e.op === "takeDamage" && e.assetsFirst ? { assetsFirst: true } : {}),
      source: ctx.source ?? null,
    });
  return;
}

function healEffect(game: GameContext, run: EffectRun<EffectOf<"heal">>) {
  const { step, ctx } = run;
  const e = run.effect;
  const damage = e.damage === undefined ? 0 : amt(game, e.damage, ctx);
  const horror = e.horror === undefined ? 0 : amt(game, e.horror, ctx);

  // an Ally asset may be healed instead of an investigator: choose who first, then heal them
  if (e.targetAlly && ctx.you) {
    const mine = ctx.you;
    const people = e.target === "you" ? [mine] : invsAt(game, inv(game, mine).location);
    const allies = allCards(game).filter(
      (c) =>
        c.zone === "play" &&
        c.controller &&
        def(game, c.id).traits.includes("Ally") &&
        (e.targetAlly === "controlled"
          ? c.controller === mine
          : inv(game, c.controller).location === inv(game, mine).location),
    );
    const opts = [
      ...people.map((i) => ({
        id: i,
        label: invName(game, i),
        card: inv(game, i).cardId,
        value: i,
      })),
      ...allies.map((a) => ({ id: a.id, label: def(game, a.id).name, card: a.id, value: a.id })),
    ];
    const pick = ask<string>(game, step, mine, CHOICE.Target, "Choose who to heal", opts, {
      auto: true,
      key: "chooseHealTarget",
    });
    if (pick === undefined) return;
    const asset = cardIf(game, pick);
    if (asset) {
      const d = Math.min(damage, asset.damage);
      const h = Math.min(horrorHealable(game, ctx.you, asset.id, horror), asset.horror);
      addCounter(game, asset.id, "damage", -d);
      addCounter(game, asset.id, "horror", -h);
      if (d || h)
        emit(game, EVENT.Heal, `${def(game, asset.id).name} heals ${d} damage and ${h} horror`, {
          card: asset.id,
          data: { damage: d, horror: h },
        });
      if (h) push(game, healedWindow(ctx, asset.id, h));
      return;
    }
    push(game, {
      ...step,
      choice: undefined,
      effect: { ...e, target: "eventInvestigator", targetAlly: undefined } as Effect,
      ctx: { ...ctx, inv: pick },
    });
    return;
  }
  const ts = invTargets(game, step, e.target, ctx);
  if (!ts) return;
  for (const i of ts) {
    const me = inv(game, i);
    const d = Math.min(damage, me.damage);
    const h = Math.min(horrorHealable(game, ctx.you, me.cardId, horror), me.horror);
    addCounter(game, me.id, "damage", -d);
    addCounter(game, me.id, "horror", -h);
    if (d || h)
      emit(game, EVENT.Heal, `${me.name} heals ${d} damage and ${h} horror`, {
        inv: i,
        data: { damage: d, horror: h },
      });
    if (h) push(game, healedWindow(ctx, me.cardId, h));
    // "if Mark Harrigan has 4 or less damage on him" (Sophie)
    if (d) push(game, win("damageHealed", { inv: i, amount: d }));
  }
  return;
}

function dealDamageEffect(game: GameContext, run: EffectRun<EffectOf<"dealDamage">>) {
  const { step, ctx } = run;
  const e = run.effect;

  const ts = enemyTargets(game, step, e.to, ctx);
  if (!ts) return;
  for (const id of ts)
    push(game, {
      t: STEP.DamageEnemy,
      enemy: id,
      amount: amt(game, e.amount, ctx),
      by: ctx.you ?? null,
      source: ctx.source ?? null,
    });
  return;
}

function addDamageEffect(game: GameContext, run: EffectRun<EffectOf<"addDamage">>) {
  const { ctx } = run;
  const e = run.effect;

  // no key gives the key "undefined", as before
  damageBonus.add(game, String(ctx.key), e.amount);
  return;
}

function preventDamageEffect(game: GameContext, run: EffectRun<EffectOf<"preventDamage">>) {
  const { step, ctx, you } = run;
  const e = run.effect;

  if (!ctx.key || !ctx.dealt) return;
  const done = prevented.get(game, ctx.key) ?? [0, 0];
  const left: [number, number] = [ctx.dealt[0] - done[0], ctx.dealt[1] - done[1]];
  // up to `amount` points among both: all of it when it fits, else the player splits them ("I've had worse…")
  if (e.kind === "both") {
    let split: [number, number] = left;
    if (left[0] + left[1] > e.amount) {
      const lo = Math.max(0, e.amount - left[1]);
      const hi = Math.min(e.amount, left[0]);
      const d = ask<number>(
        game,
        step,
        you,
        CHOICE.Generic,
        `Cancel which ${e.amount}?`,
        Array.from({ length: hi - lo + 1 }, (_, k) => {
          const damage = hi - k;
          const horror = e.amount - damage;
          return {
            id: String(damage),
            label: `Cancel ${damage} damage and ${horror} horror`,
            value: damage,
            key: "option.preventSplit",
            vars: { damage, horror },
          };
        }),
        { key: "preventSplit", vars: { n: e.amount } },
      );
      if (d === undefined) return;
      split = [d, e.amount - d];
    }
    const n = split[0] + split[1];
    if (n <= 0) return;
    prevented.set(game, ctx.key, [done[0] + split[0], done[1] + split[1]]);
    emit(
      game,
      EVENT.Prevent,
      `${invName(game, you)} prevents ${split[0]} damage and ${split[1]} horror`,
      { inv: you, card: ctx.source ?? null, data: { damage: split[0], horror: split[1] } },
    );
    if (e.gain) push(game, { t: STEP.Eff, effect: { op: "gainResources", amount: n }, ctx });
    return;
  }
  let kind = e.kind;
  if (kind === "either") {
    if (left[0] > 0 && left[1] > 0) {
      const pick = ask<"damage" | "horror">(
        game,
        step,
        you,
        CHOICE.Generic,
        "Prevent damage or horror?",
        [
          {
            id: "damage",
            label: "Prevent damage",
            value: "damage",
            key: "option.preventDamage",
          },
          {
            id: "horror",
            label: "Prevent horror",
            value: "horror",
            key: "option.preventHorror",
          },
        ],
        { key: "preventWhich" },
      );
      if (pick === undefined) return;
      kind = pick;
    } else kind = left[0] > 0 ? "damage" : "horror";
  }
  const k = kind === "damage" ? 0 : 1;
  const n = Math.min(e.amount, left[k]);
  if (n <= 0) return;
  const next: [number, number] = [...done];
  next[k] += n;
  prevented.set(game, ctx.key, next);
  emit(game, EVENT.Prevent, `${invName(game, you)} prevents ${n} ${kind}`, {
    inv: you,
    card: ctx.source ?? null,
    data: { damage: kind === "damage" ? n : 0, horror: kind === "horror" ? n : 0 },
  });
  return;
}

function healEnemyEffect(game: GameContext, run: EffectRun<EffectOf<"healEnemy">>) {
  const { src } = run;
  const e = run.effect;

  if (!src || src.zone !== "enemy") return;
  setCounter(game, src.id, "damage", Math.max(0, src.damage - e.amount));
  emit(game, EVENT.Heal, `${def(game, src.id).name} heals ${e.amount} damage`, {
    card: src.id,
    data: { damage: e.amount, horror: 0 },
  });
  return;
}

function healSelfEffect(game: GameContext, run: EffectRun<EffectOf<"healSelf">>) {
  const { step, you, src } = run;
  const e = run.effect;

  if (!src) return;
  const can = [
    ...(e.damage && src.damage ? ["damage" as const] : []),
    ...(e.horror && src.horror ? ["horror" as const] : []),
  ];
  if (!can.length) return;
  const kind = ask<"damage" | "horror">(
    game,
    step,
    you,
    CHOICE.Generic,
    "Heal damage or horror?",
    can.map((k) => ({
      id: k,
      label: `Heal ${k}`,
      value: k,
      key: k === "damage" ? "option.healDamage" : "option.healHorror",
    })),
    { auto: true, key: "healWhich" },
  );
  if (kind === undefined) return;
  const n = Math.min(kind === "damage" ? e.damage! : e.horror!, src[kind]);
  addCounter(game, src.id, kind, -n);
  emit(game, EVENT.Heal, `${def(game, src.id).name} heals ${n} ${kind}`, {
    card: src.id,
    data: { damage: kind === "damage" ? n : 0, horror: kind === "horror" ? n : 0 },
  });
  return;
}

/**
 * An enemy attacks: the source, the event's enemy, each at your location, or the one in play of a code; it readies and
 * engages the investigator first when the card says (Clover Club Pit Boss)
 */
function enemyAttackEffect(game: GameContext, run: EffectRun<EffectOf<"enemyAttack">>) {
  const { step, ctx } = run;
  const e = run.effect;
  const named = e.named ? enemies(game).find((x) => x.code === e.named) : undefined;
  const attackers = e.named
    ? named
      ? [named.id]
      : []
    : enemyTargets(
        game,
        step,
        e.enemy ?? "self",
        ctx,
        (id) =>
          (!e.filter || matchesFilter(game, card(game, id).code, e.filter)) &&
          (!e.onlyReady || !card(game, id).exhausted),
      );
  const ts = invTargets(game, step, e.target, ctx);
  if (!attackers || !ts) return;
  const steps: Step[] = [];
  for (const i of ts) {
    if (inv(game, i).status !== "playing") continue;
    for (const id of attackers) {
      if (e.ready) ready(game, id);
      if (e.engage && card(game, id).engagedWith !== i) {
        setEngaged(game, id, i);
        emit(game, EVENT.Engage, `${def(game, id).name} engages ${invName(game, i)}`, {
          inv: i,
          card: id,
        });
      }
      steps.push({ t: STEP.EnemyAttack, enemy: id, inv: i, aoo: false, key: attackKey(game) });
    }
  }
  push(game, ...steps);
}

/** damage on each of your assets with health that matches the filter, then the defeat check */
function damageAssetsEffect(game: GameContext, run: EffectRun<EffectOf<"damageAssets">>) {
  const { you, ctx, effect: e } = run;
  const n = amt(game, e.amount, ctx);
  const hit = controlled(game, you).filter(
    (c) =>
      def(game, c.id).type === "asset" &&
      !!def(game, c.id).health &&
      (!e.filter || matchesFilter(game, c.code, e.filter)),
  );
  if (n <= 0 || !hit.length) return;
  for (const c of hit) {
    addCounter(game, c.id, "damage", n);
    emit(game, EVENT.AssetDamage, `${def(game, c.id).name} takes ${n} damage, 0 horror`, {
      card: c.id,
      inv: you,
      data: { damage: n, horror: 0, source: ctx.source ?? null },
    });
  }
  push(game, { t: STEP.AssetDefeatCheck, inv: you });
}

/** the context's enemy, still in play, is defeated; `nonElite`: unless it is [[Elite]] (Monster Slayer 5) */
function defeatEnemyEffect(game: GameContext, run: EffectRun<EffectOf<"defeatEnemy">>) {
  const enemy = run.ctx.enemy;
  if (!enemy || cardIf(game, enemy)?.zone !== "enemy") return;
  if (run.effect.nonElite && isElite(game, enemy)) return;
  push(game, { t: STEP.DefeatEnemy, enemy, by: run.you });
}

/** in a damageAssigned window: points of the damage just assigned to the card cancelled before it is placed */
function cancelAssignedDamageEffect(
  game: GameContext,
  run: EffectRun<EffectOf<"cancelAssignedDamage">>,
) {
  const { ctx } = run;
  if (!ctx.key) return;
  const done = prevented.get(game, ctx.key) ?? [0, 0];
  prevented.set(game, ctx.key, [done[0] + run.effect.amount, done[1]]);
  emit(
    game,
    EVENT.Prevent,
    `${def(game, ctx.card ?? ctx.source!).name}: ${run.effect.amount} damage cancelled`,
    {
      card: ctx.card ?? ctx.source ?? null,
    },
  );
}

export const damageEffects = {
  cancelAssignedDamage: cancelAssignedDamageEffect,
  defeatEnemy: defeatEnemyEffect,
  enemyAttack: enemyAttackEffect,
  damageAssets: damageAssetsEffect,
  takeDamage: takeDamageOrHorrorEffect,
  takeHorror: takeDamageOrHorrorEffect,
  heal: healEffect,
  dealDamage: dealDamageEffect,
  addDamage: addDamageEffect,
  preventDamage: preventDamageEffect,
  healEnemy: healEnemyEffect,
  healSelf: healSelfEffect,
};
