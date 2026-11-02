/** Effects that deal, take, prevent and heal damage and horror. */
import { damageBonus, prevented } from "../world/flags";
import type { Effect } from "../../content/schema";
import {
  addCounter,
  allCards,
  ask,
  cardIf,
  def,
  emit,
  type GameContext,
  inv,
  invName,
  push,
  setCounter,
} from "../context";
import { invsAt } from "../queries";
import { win } from "../rules/cards";
import type { EffCtx, InstId, InvId } from "../world/types";
import { amt, enemyTargets, invTargets } from "./targets";
import type { EffectOf, EffectRun } from "./types";
import { EVENT } from "../events/event";
import { CHOICE } from "../world/constants";
import { STEP } from "../steps/step";

/** horror a heal may remove from `target`, after the cards in play that restrict or redirect it (Rational Thought) */
function horrorHealable(
  game: GameContext,
  healer: InvId | null | undefined,
  target: InstId,
  n: number,
): number {
  const req = { target, n };
  for (const c of allCards(game))
    if (c.zone === "threat" || c.zone === "play")
      game.db.scripts[c.code]?.hooks?.healHorror?.(
        game,
        { source: c.id, you: c.controller, inv: healer ?? null },
        req,
      );
  return req.n;
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
      source: ctx.source ?? null,
    });
  return;
}

function healEffect(game: GameContext, run: EffectRun<EffectOf<"heal">>) {
  const { step, ctx } = run;
  const e = run.effect;

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
      const d = Math.min(e.damage ?? 0, asset.damage);
      const h = Math.min(horrorHealable(game, ctx.you, asset.id, e.horror ?? 0), asset.horror);
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
    const d = Math.min(e.damage ?? 0, me.damage);
    const h = Math.min(horrorHealable(game, ctx.you, me.cardId, e.horror ?? 0), me.horror);
    addCounter(game, me.id, "damage", -d);
    addCounter(game, me.id, "horror", -h);
    if (d || h)
      emit(game, EVENT.Heal, `${me.name} heals ${d} damage and ${h} horror`, {
        inv: i,
        data: { damage: d, horror: h },
      });
    if (h) push(game, healedWindow(ctx, me.cardId, h));
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

export const damageEffects = {
  takeDamage: takeDamageOrHorrorEffect,
  takeHorror: takeDamageOrHorrorEffect,
  heal: healEffect,
  dealDamage: dealDamageEffect,
  addDamage: addDamageEffect,
  preventDamage: preventDamageEffect,
  healEnemy: healEnemyEffect,
  healSelf: healSelfEffect,
};
