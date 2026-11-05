/** Who and what an effect applies to: investigator and enemy targets, amounts, and the options they offer. */
import type { Amount, Effect, EnemyTarget, InvTarget } from "../../content/schema";
import {
  activeInvs,
  ask,
  cardIf,
  def,
  type GameContext,
  inv,
  invName,
  leadInvestigator,
  playerCount,
  push,
  tokensOn,
} from "../context";
import {
  actionsLeft,
  beneathCount,
  checkCondition,
  connections,
  tokenHolder,
  distances,
  enemies,
  enemiesAt,
  engagedWith,
  enemyStat,
  immuneTo,
  invsAt,
  skillValue,
} from "../queries";
import type { EffCtx, InstId, InvId } from "../world/types";
import type { EffStep } from "./types";
import { CHOICE } from "../world/constants";

export function amt(game: GameContext, a: Amount, ctx: EffCtx): number {
  if (typeof a === "number") return a;
  if (typeof a === "object")
    return "onSelf" in a
      ? ctx.source
        ? (cardIf(game, ctx.source)?.[a.onSelf] ?? 0)
        : 0
      : "yourClues" in a
        ? Math.min(a.max ?? Infinity, a.yourClues * (ctx.you ? inv(game, ctx.you).clues : 0))
        : "yourSkill" in a
          ? ctx.you
            ? skillValue(game, ctx.you, a.yourSkill)
            : 0
          : "beneathCount" in a
            ? beneathCount(game, a.beneathCount, ctx)
            : "cluesOnEnemy" in a
              ? a.cluesOnEnemy * (ctx.enemy ? (cardIf(game, ctx.enemy)?.clues ?? 0) : 0)
              : "tokensOn" in a
                ? (() => {
                    const h = tokenHolder(game, a.tokensOn.on, ctx);
                    return h ? tokensOn(game, h, a.tokensOn.name) : 0;
                  })()
                : "onYou" in a
                  ? (ctx.you ? inv(game, ctx.you)[a.onYou] : 0) + (a.plus ?? 0)
                  : "base" in a
                    ? a.base + (checkCondition(game, a.if, ctx) ? a.plus : 0)
                    : "actionsLeft" in a
                      ? a.actionsLeft * actionsLeft(game, ctx.you ?? null)
                      : "eventEnemyStat" in a
                        ? ctx.enemy && cardIf(game, ctx.enemy)
                          ? enemyStat(game, ctx.enemy, a.eventEnemyStat)
                          : 0
                        : a.perInvestigator * playerCount(game);
  if (a === "failBy") return ctx.failBy ?? 0;
  if (a === "succeedBy") return ctx.succeedBy ?? 0;
  if (a === "X") return ctx.x ?? 0;
  return Infinity; // "all"
}

export const opt = (game: GameContext, id: InstId, label?: string) => ({
  id,
  label: label ?? def(game, id).name,
  card: id,
  value: id,
});

/** resolve investigator targets; undefined = waiting for a choice */
export function invTargets(
  game: GameContext,
  step: EffStep,
  t: InvTarget | undefined,
  ctx: EffCtx,
): InvId[] | undefined {
  const you = ctx.you!;
  switch (t ?? "you") {
    case "you":
      return you ? [you] : [];
    case "lead":
      return [leadInvestigator(game)];
    case "each":
      return activeInvs(game);
    case "eachAtLocation":
      return invsAt(game, inv(game, you).location);
    case "eachAtAttachedLocation": {
      const src = ctx.source ? cardIf(game, ctx.source) : undefined;
      // attached to a card (an enemy): where that card is
      const host = src?.attachedTo ? cardIf(game, src.attachedTo) : src;
      return invsAt(game, host?.zone === "location" ? host.id : (host?.location ?? null));
    }
    case "eventInvestigator":
      return ctx.inv ? [ctx.inv] : [];
    case "chooseOtherAtLocation":
    case "chooseAtOrConnecting":
    case "chooseAny":
    case "chooseAtLocation": {
      const loc = inv(game, you).location;
      const here =
        t === "chooseAny"
          ? activeInvs(game)
          : [
              ...invsAt(game, loc),
              ...(t === "chooseAtOrConnecting" && loc
                ? connections(game, loc).flatMap((l) => invsAt(game, l))
                : []),
            ].filter((i) => t !== "chooseOtherAtLocation" || i !== you);
      if (!here.length) return [];
      const pick = ask<InvId>(
        game,
        step,
        you,
        CHOICE.Target,
        "Choose an investigator",
        here.map((i) => ({ id: i, label: invName(game, i), card: inv(game, i).cardId, value: i })),
        { auto: true, key: "chooseInvestigator" },
      );
      if (pick === undefined) return undefined;
      // chosen (or auto-picked as the only one): re-run with a fixed target so later choices of this effect
      // (e.g. Old Book of Lore's search) get a fresh answer slot instead of reading this one
      push(game, {
        ...step,
        choice: undefined,
        effect: { ...step.effect, target: "eventInvestigator" } as Effect,
        ctx: { ...ctx, inv: pick },
      });
      return undefined;
    }
  }
}

export function nearest(
  game: GameContext,
  from: InstId | null,
  filter: (id: InstId) => boolean,
): InstId[] {
  const cands = enemies(game).filter((e) => filter(e.id));
  if (!from || !cands.length) return cands.map((e) => e.id);
  const d = distances(game, from);
  const best = Math.min(...cands.map((e) => d.get(e.location!) ?? Infinity));
  return cands.filter((e) => (d.get(e.location!) ?? Infinity) === best).map((e) => e.id);
}

/** an attack is still made on an enemy immune to its card's effects: the test is a game action (Grimoire, Immune) */
export const ATTACK_OPS: ReadonlySet<string> = new Set(["fight", "evade"]);

/** resolve enemy targets; undefined = waiting. An enemy immune to the effect's card is never one. */
export function enemyTargets(
  game: GameContext,
  step: EffStep,
  t: EnemyTarget,
  ctx: EffCtx,
  allowed: (id: InstId) => boolean = () => true,
): InstId[] | undefined {
  const ok = (id: InstId) =>
    allowed(id) && (ATTACK_OPS.has(step.effect.op) || !immuneTo(game, id, ctx.source));
  const you = ctx.you;
  const loc = you ? inv(game, you).location : null;
  const choose = (all: InstId[], prompt: string) => {
    const ids = all.filter(ok);
    if (!ids.length) return [];
    const pick = ask<InstId>(
      game,
      step,
      you ?? leadInvestigator(game),
      CHOICE.Target,
      prompt,
      ids.map((id) => opt(game, id)),
      { auto: true, key: "chooseEnemy" },
    );
    return pick === undefined ? undefined : [pick];
  };
  switch (t) {
    case "self":
      return ctx.source && cardIf(game, ctx.source)?.zone === "enemy" ? [ctx.source] : [];
    case "eventEnemy":
      return ctx.enemy && cardIf(game, ctx.enemy)?.zone === "enemy" ? [ctx.enemy] : [];
    case "eachAtLocation":
      return enemiesAt(game, loc)
        .map((e) => e.id)
        .filter(ok);
    case "chooseAtLocation":
      return choose(
        enemiesAt(game, loc).map((e) => e.id),
        "Choose an enemy at your location",
      );
    case "chooseEngaged":
      return choose(
        engagedWith(game, you!).map((e) => e.id),
        "Choose an enemy engaged with you",
      );
    case "chooseExhaustedAtLocation":
      return choose(
        enemiesAt(game, loc)
          .filter((e) => e.exhausted)
          .map((e) => e.id),
        "Choose an exhausted enemy",
      );
    case "nearestCultist":
      return choose(
        nearest(game, loc, (id) => def(game, id).traits.includes("Cultist")),
        "Choose the nearest Cultist enemy",
      );
    case "nearestEnemy":
      return choose(
        nearest(game, loc, () => true),
        "Choose the nearest enemy",
      );
  }
}
