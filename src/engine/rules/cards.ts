import { costMod } from "../world/flags";
import type { Ability, CardDef, Cost, Slot, Trigger } from "../../content/schema";
import {
  abilitiesOf,
  actClueCost,
  allMods,
  attackableBy,
  enemiesAt,
  blankedCards,
  advanceableActs,
  canPay,
  cardBlocked,
  cardsIn,
  checkCondition,
  controlled,
  hasFlag,
  invsAt,
  matchesFilter,
  modSum,
  uniqueInPlay,
  isHidden,
  offRole,
  discardLocked,
  endNextPlayMods,
} from "../queries";
import {
  activeInvestigator,
  activeInvs,
  addCounter,
  allCards,
  ask,
  card,
  cardIf,
  currentAct,
  def,
  emit,
  exhaust,
  type GameContext,
  inv,
  invIf,
  invName,
  leadInvestigator,
  limitUses,
  periodCounter,
  playerCount,
  push,
  recordLimitUse,
  setController,
  setCounter,
} from "../context";
import { discard, moveCard } from "../movement";
import type { EffCtx, EventData, InstId, InvId, Step, StepOf } from "../world/types";
import { EVENT } from "../events/event";
import { ZONE, CHOICE, type Zone } from "../world/constants";
import { STEP } from "../steps/step";
import { scriptOf } from "../world/scripts";
import { fireCardHook } from "./scripts";

type Handler<T extends Step["t"]> = (game: GameContext, step: Extract<Step, { t: T }>) => void;

// ---------- limits ----------
function periodKey(game: GameContext, per: "test" | "turn" | "phase" | "round" | "game") {
  return per === "game" ? "game" : `${per}${periodCounter(game, per)}`;
}
/** `forInv`: the event's investigator, for a limit counted apart per investigator ("once for each investigator") */
function limitKey(
  game: GameContext,
  cardId: InstId,
  index: number,
  a: Ability,
  forInv?: InvId | null,
) {
  const c = card(game, cardId);
  const who = a.limit?.group ? c.code : cardId;
  const each = a.limit?.eachInvestigator ? `:${forInv ?? ""}` : "";
  return `${who}:${index}:${periodKey(game, a.limit!.per)}${each}`;
}
export function withinLimit(
  game: GameContext,
  cardId: InstId,
  index: number,
  a: Ability,
  forInv?: InvId | null,
) {
  if (!a.limit) return true;
  return limitUses(game, limitKey(game, cardId, index, a, forInv)) < a.limit.count;
}
function recordUse(
  game: GameContext,
  cardId: InstId,
  index: number,
  a: Ability,
  forInv?: InvId | null,
) {
  if (!a.limit) return;
  recordLimitUse(game, limitKey(game, cardId, index, a, forInv));
}

// ---------- costs ----------
/** pay non-interactive costs (discarding from hand is chosen beforehand); returns the damage/horror to take first */
export function payCost(
  game: GameContext,
  i: InvId,
  cardId: InstId,
  cost: Cost | undefined,
): Step[] {
  if (!cost) return [];
  const c = card(game, cardId);
  const me = inv(game, i);
  if (cost.exhaust) exhaust(game, c.id);
  if (cost.uses) addCounter(game, c.id, "uses", -cost.uses);
  const spent = (cost.resources ?? 0) + (cost.resourcesPerInvestigator ?? 0) * playerCount(game);
  addCounter(game, me.id, "resources", -spent);
  const take: Step[] = spent
    ? [win("resourcesSpent", { inv: i, card: cardId, amount: spent })]
    : [];
  if (cost.resourcesOrUses) {
    if (c.uses >= cost.resourcesOrUses) addCounter(game, c.id, "uses", -cost.resourcesOrUses); // ponytail: the card first; a prompt if a card ever wants the pool spent first
    else addCounter(game, me.id, "resources", -cost.resourcesOrUses);
  }
  if (cost.clues) addCounter(game, me.id, "clues", -cost.clues);
  if (cost.actions) addCounter(game, me.id, "actionsLeft", -cost.actions);
  if (cost.cluesPerInvestigator)
    spendGroupClues(game, cost.cluesPerInvestigator * playerCount(game));
  // damage or horror taken as a cost is not direct: it may go on assets (Holy Rosary)
  if (cost.takeDamage)
    take.push({
      t: STEP.AssignDamage,
      inv: i,
      damage: cost.takeDamage,
      horror: 0,
      direct: false,
      source: cardId,
    });
  if (cost.takeHorror)
    take.push({
      t: STEP.AssignDamage,
      inv: i,
      damage: 0,
      horror: cost.takeHorror,
      direct: false,
      source: cardId,
    });
  if (cost.horrorOnSelf) addCounter(game, c.id, "horror", cost.horrorOnSelf);
  if (cost.damageOnSelf) addCounter(game, c.id, "damage", cost.damageOnSelf);
  if (cost.doomOnSelf) take.push({ t: STEP.PlaceDoom, card: c.id, n: cost.doomOnSelf });
  if (cost.discardSelf) discard(game, cardId);
  return take;
}

/** spend clues as a group (or as the group `among`), lead investigator first then player order */
export function spendGroupClues(game: GameContext, n: number, among?: readonly InvId[]) {
  const order = [
    leadInvestigator(game),
    ...activeInvs(game).filter((x) => x !== leadInvestigator(game)),
  ].filter((x) => !among || among.includes(x));
  for (const i of order) {
    const take = Math.min(n, inv(game, i).clues);
    addCounter(game, i, "clues", -take);
    n -= take;
  }
}

// ---------- ability discovery ----------
export interface AbilityRef {
  card: InstId;
  index: number;
  ability: Ability & { run?: string };
  controller: InvId;
}

const ABILITY_ZONES: Zone[] = [
  ZONE.Play,
  ZONE.Threat,
  ZONE.Attached,
  ZONE.Location,
  ZONE.Enemy,
  ZONE.Act,
  ZONE.Agenda,
  ZONE.Investigator,
];

/** who may use an ability of this card */
function usersOf(game: GameContext, cardId: InstId, a: Ability): InvId[] {
  const c = card(game, cardId);
  const by = a.usableBy ?? (c.controller ? "controller" : "atLocation");
  if (by === "controller")
    return c.controller && inv(game, c.controller).status === "playing" ? [c.controller] : [];
  if (by === "anyone") return activeInvs(game);
  if (by === "engaged") return c.engagedWith ? [c.engagedWith] : [];
  const loc =
    c.zone === "location"
      ? c.id
      : c.zone === "enemy" || c.zone === "attached"
        ? c.location
        : c.controller
          ? inv(game, c.controller).location
          : null;
  if (c.zone === "act" || c.zone === "agenda") return activeInvs(game);
  return invsAt(game, loc);
}

/** an asset whose abilities its controller can't trigger (The Necronomicon blocks the others) */
function assetBlocked(game: GameContext, cardId: InstId): boolean {
  const c = card(game, cardId);
  if (c.zone !== "play" || !c.controller || def(game, cardId).type !== "asset") return false;
  return allMods(game).some(
    (m) =>
      m.target === c.controller &&
      m.mod.flag === "cannotUseOtherAssetAbilities" &&
      m.source !== cardId,
  );
}

/** activatable abilities ([action] or [fast]) the investigator could use now */
export function activatable(
  game: GameContext,
  i: InvId,
  kinds: ("action" | "fast")[],
): AbilityRef[] {
  const out: AbilityRef[] = [];
  const blanked = blankedCards(game);
  for (const c of allCards(game)) {
    // a Hidden card in a hand works as if in its holder's threat area
    if (!ABILITY_ZONES.includes(c.zone) && !isHidden(game, c.id)) continue;
    if (c.zone === "location" && !c.revealed) continue;
    if (assetBlocked(game, c.id)) continue;
    abilitiesOf(game, c.id, blanked).forEach((a, index) => {
      if (!kinds.includes(a.kind as "action" | "fast")) return;
      if (a.kind === "fast" && hasFlag(game, i, "cannotTriggerFast")) return;
      // "You cannot trigger [action] abilities on locations" (Gift of Madness (Misery))
      if (
        a.kind === "action" &&
        c.zone === ZONE.Location &&
        hasFlag(game, i, "cannotUseLocationActions")
      )
        return;
      if (!usersOf(game, c.id, a).includes(i)) return;
      // Lola Hayes triggers abilities only on Neutral cards and cards of her role
      if (offRole(game, i, c.id)) return;
      if (!withinLimit(game, c.id, index, a)) return;
      if (
        a.condition &&
        !checkCondition(game, a.condition, {
          source: c.id,
          you: i,
          enemy: c.zone === "enemy" ? c.id : null,
        })
      )
        return;
      if (!canPay(game, i, c.id, a.cost)) return;
      // a fight with this card isn't offered when the only enemies here can be attacked only with another (the Brood)
      const here = a.designator === "fight" ? enemiesAt(game, inv(game, i).location) : [];
      if (here.length && !here.some((e) => attackableBy(game, e.id, c.id))) return;
      out.push({ card: c.id, index, ability: a, controller: i });
    });
  }
  return out;
}

// ---------- triggers ----------
/** triggers whose subject is a card; encounter cards only react to themselves */
function isSubject(game: GameContext, cardId: InstId, data: EventData) {
  const c = card(game, cardId);
  // a card attached to an enemy watches that enemy and the place it is at (Altered Beast)
  const host = c.zone === "attached" && c.attachedTo ? cardIf(game, c.attachedTo) : undefined;
  return (
    data.card === cardId ||
    data.enemy === cardId ||
    data.location === cardId ||
    (c.zone === "attached" && !!data.location && c.location === data.location) ||
    (host?.zone === "enemy" &&
      (data.enemy === host.id || (!!data.location && host.location === data.location)))
  );
}

/**
 * events about the whole game an encounter card's forced ability may wait for, whatever card they name (Black Stars
 * Rise's Outer Wall: "after 1 or more doom is placed on the 'a' agenda deck")
 */
const GAME_EVENTS: readonly Trigger[] = [
  "agendaAdvances",
  "doomPlaced",
  // "after any investigator performs a parley action" (Return to The Last King's Dianne Devine)
  "parleyed",
];

function triggerMatches(
  game: GameContext,
  cardId: InstId,
  a: Ability,
  you: InvId | null,
  data: EventData,
): boolean {
  const hasSubject = !!(data.card || data.enemy || data.location);
  if (!you) {
    // "the engaged investigator draws …" (Wizard of Yog-Sothoth): an enemy's forced ability about whom it engages
    if (a.usableBy === "engaged")
      return !!data.inv && cardIf(game, cardId)?.engagedWith === data.inv;
    // an enemy waits on an investigator entering its location (Amorphous Terror: "or vice versa")
    if (a.trigger === "enterLocation" && card(game, cardId).zone === ZONE.Enemy)
      return !!data.location && card(game, cardId).location === data.location;
    // an act or agenda is about the whole game ("if an investigator deals damage to a [[Criminal]] enemy")
    const zone = card(game, cardId).zone;
    return (
      isSubject(game, cardId, data) ||
      !hasSubject ||
      GAME_EVENTS.includes(a.trigger!) ||
      zone === ZONE.Act ||
      zone === ZONE.Agenda ||
      // a location waits on what an investigator at it draws (Sentinel Peak: "draws a [[Hex]] card")
      (zone === ZONE.Location &&
        a.trigger === "treacheryDrawn" &&
        !!data.inv &&
        inv(game, data.inv).location === cardId)
    );
  }
  if (isSubject(game, cardId, data)) return true;
  // "after X enters play" is about the card itself; an attached card watches only its own location
  if (
    a.trigger === "enterPlay" ||
    (card(game, cardId).zone === "attached" &&
      (a.trigger === "enterLocation" || a.trigger === "leaveLocation"))
  )
    return false;
  if (!data.inv) return !hasSubject || a.usableBy === "anyone";
  if (data.inv === you) return true;
  if (a.usableBy === "anyone") return true;
  if (a.usableBy === "atLocation") return inv(game, data.inv).location === inv(game, you).location;
  return false;
}

export function ctxFor(data: EventData, source: InstId, you: InvId | null): EffCtx {
  return {
    source,
    you,
    ...(data.via ? { via: data.via } : {}),
    inv: data.inv ?? data.defeatedBy ?? null,
    enemy: data.enemy ?? data.defeated ?? null,
    location: data.location ?? null,
    key: data.key,
    card: data.card ?? null,
    from: data.from,
    ...(data.to ? { to: data.to } : {}),
    by: data.by,
    token: data.token,
    testId: data.testId,
    failBy: data.margin !== undefined && data.margin < 0 ? -data.margin : undefined,
    succeedBy: data.margin !== undefined && data.margin >= 0 ? data.margin : undefined,
    x: data.amount,
    dealt:
      data.damage !== undefined || data.horror !== undefined
        ? [data.damage ?? 0, data.horror ?? 0]
        : undefined,
    ...(data.aoo ? { aoo: true as const } : {}),
    ...(data.cause ? { cause: data.cause } : {}),
  };
}

/** the cards an investigator may play as if from hand: the hand, plus e.g. the top event of the discard pile (Wendy's Amulet) */
export function playable(game: GameContext, i: InvId): InstId[] {
  const extra = [...controlled(game, i), card(game, inv(game, i).cardId)].flatMap(
    (c) => scriptOf(game.db, c.code)?.extraPlayable?.(game, c.id, i) ?? [],
  );
  // a card in a discard pile no card may leave stays there (Graveyard Ghouls)
  const locked = extra.length > 0 && discardLocked(game, i);
  return [
    ...inv(game, i).hand,
    ...(locked ? extra.filter((id) => card(game, id).zone !== ZONE.Discard) : extra),
  ];
}

function triggered(game: GameContext, trigger: Trigger, data: EventData): AbilityRef[] {
  const out: AbilityRef[] = [];
  const blanked = blankedCards(game);
  const consider = (
    cardId: InstId,
    you: InvId | null,
    fromHand: boolean,
    only?: "reaction" | "forced",
  ) => {
    abilitiesOf(game, cardId, blanked).forEach((a, index) => {
      if (a.trigger !== trigger || (a.kind !== "reaction" && a.kind !== "forced")) return;
      if (only && a.kind !== only) return;
      // an encounter card's reaction belongs to each investigator who may use it (a location's, to those there)
      if (only === "reaction" && (!you || !usersOf(game, cardId, a).includes(you))) return;
      if (fromHand !== !!(a.fromHand || a.revealOnly)) return;
      // a card played from elsewhere (Wendy's Amulet) is played, never revealed, and its forced in-hand abilities stay quiet
      if (fromHand && card(game, cardId).zone !== "hand" && (a.revealOnly || a.kind !== "reaction"))
        return;
      if (!fromHand && assetBlocked(game, cardId)) return;
      if (a.kind === "reaction" && you && offRole(game, you, cardId)) return;
      if (!triggerMatches(game, cardId, a, you, data)) return;
      if (!withinLimit(game, cardId, index, a, data.inv)) return;
      if (a.condition && !checkCondition(game, a.condition, ctxFor(data, cardId, you))) return;
      if (you && a.kind === "reaction" && !canPay(game, you, cardId, a.cost)) return;
      if (fromHand && you && a.kind === "reaction" && !a.revealOnly) {
        const cost = playCost(game, you, cardId);
        if (inv(game, you).resources < cost || playForbidden(game, you, cardId)) return;
      }
      out.push({ card: cardId, index, ability: a, controller: you as InvId });
    });
  };
  for (const c of allCards(game)) {
    if (ABILITY_ZONES.includes(c.zone) || isHidden(game, c.id)) {
      if (c.zone === "location" && !c.revealed && trigger !== "enterLocation") continue;
      if (c.controller) consider(c.id, c.controller, false);
      else {
        consider(c.id, null, false, "forced");
        for (const i of activeInvs(game)) consider(c.id, i, false, "reaction");
      }
    } else if (c.zone === ZONE.Commit && c.controller && def(game, c.id).type === "skill")
      // a committed skill's own forced timing within its test ("before revealing chaos tokens": Defiance)
      consider(c.id, c.controller, false, "forced");
  }
  for (const i of activeInvs(game)) for (const h of playable(game, i)) consider(h, i, true);
  if (trigger === "playerWindow") {
    // fast events printed "play during any [fast] window" (ADR-0014)
    for (const i of activeInvs(game)) {
      for (const h of playable(game, i)) {
        const a = abilitiesOf(game, h, blanked).findIndex(
          (x) => x.kind === "onPlay" && x.anyWindow,
        );
        if (a < 0) continue;
        const ab = abilitiesOf(game, h, blanked)[a];
        if (def(game, h).type !== "event" || !def(game, h).keywords.includes("fast")) continue;
        if (playForbidden(game, i, h) || inv(game, i).resources < playCost(game, i, h)) continue;
        if (ab.condition && !checkCondition(game, ab.condition, { source: h, you: i })) continue;
        out.push({ card: h, index: a, ability: ab, controller: i });
      }
    }
  }
  return out;
}

/** a timing window: forced abilities resolve, then players may use reactions */
export const windowHandler: Handler<"Window"> = (game, step) => {
  const refs = triggered(game, step.trigger, step.data);
  if (!step.forcedDone) {
    const forced = refs.filter((r) => r.ability.kind === "forced");
    // an encounter card's forced ability resolves for the investigator the event is about (Hellhound's attack)
    const who = (r: AbilityRef) =>
      r.controller ?? (step.data.inv && invIf(game, step.data.inv) ? step.data.inv : null);
    push(
      game,
      ...forced.map((r): Step => ({
        t: STEP.UseAbility,
        inv: who(r) ?? leadInvestigator(game),
        card: r.card,
        index: r.index,
        ctx: ctxFor(step.data, r.card, who(r)),
        from: card(game, r.card).zone,
      })),
      { ...step, forcedDone: true, choice: undefined },
    );
    return;
  }
  const offered = step.offered ?? [];
  const reactions = refs.filter(
    (r) =>
      (r.ability.kind === "reaction" || r.ability.anyWindow) &&
      !offered.includes(`${r.card}:${r.index}`),
  );
  // nothing to play: no window (advancing the act alone is left to the turn's actions)
  if (reactions.length === 0) return;
  // the group may spend clues to advance the act in any player window (Grimoire, Act Deck and Agenda Deck)
  const decks =
    step.trigger === "playerWindow" && !offered.includes("act") ? advanceableActs(game) : [];
  const act = decks.length > 0;
  const lead = activeInvs(game).includes(leadInvestigator(game))
    ? leadInvestigator(game)
    : activeInvs(game)[0];
  const who = reactions.length ? reactions[0].controller : lead;
  const mine = reactions.filter((r) => r.controller === who);
  const opts = [
    ...decks.map((deck) => ({
      id: deck === "a" ? "act" : `act:${deck}`,
      label: `Advance act (spend ${actClueCost(game, deck)} clues as a group)`,
      card: currentAct(game, deck)!,
      value: deck === "a" ? { kind: "advanceAct" } : { kind: "advanceAct", deck },
    })),
    ...mine.map((r) => ({
      id: `${r.card}:${r.index}`,
      label:
        r.ability.label ??
        `${def(game, r.card).name}${r.ability.fromHand || r.ability.anyWindow ? " (play)" : ""}`,
      card: r.card,
      value: `${r.card}:${r.index}`,
    })),
    { id: "pass", label: "Pass", value: "pass" },
  ];
  const pick = ask<string | { kind: "advanceAct"; deck?: string }>(
    game,
    step,
    who,
    CHOICE.Reaction,
    `${invName(game, who)}: use a reaction? (${step.trigger})`,
    opts,
    { key: step.trigger === "playerWindow" ? "playerWindow" : "reaction" },
  );
  if (pick === undefined) return;
  if (pick === "pass") {
    push(game, {
      ...step,
      choice: undefined,
      offered: [...offered, ...mine.map((r) => `${r.card}:${r.index}`), ...(act ? ["act"] : [])],
    });
    return;
  }
  if (typeof pick === "object") {
    push(
      game,
      pick.deck
        ? { t: STEP.AdvanceAct, spend: true, deck: pick.deck }
        : { t: STEP.AdvanceAct, spend: true },
      { ...step, choice: undefined, offered: [...offered, "act"] },
    );
    return;
  }
  const r = mine.find((x) => `${x.card}:${x.index}` === pick)!;
  push(
    game,
    (r.ability.fromHand || r.ability.anyWindow) && !r.ability.revealOnly
      ? {
          t: STEP.PlayCard,
          inv: who,
          card: r.card,
          ctx: ctxFor(step.data, r.card, who),
          viaTrigger: true,
        }
      : {
          t: STEP.UseAbility,
          inv: who,
          card: r.card,
          index: r.index,
          ctx: ctxFor(step.data, r.card, who),
        },
    { ...step, choice: undefined, offered: [...offered, pick] },
  );
};

export const win = (trigger: Trigger, data: EventData): Step => ({ t: STEP.Window, trigger, data });

// ---------- using abilities ----------
export const useAbilityHandler: Handler<"UseAbility"> = (game, step) => {
  const a = abilitiesOf(game, step.card)[step.index];
  if (!a) return;
  // a forced ability whose card left before its turn came (two Psychopomp's Songs: the first one's damage made the
  // second resolve and discard itself) no longer resolves
  if (step.from && card(game, step.card).zone !== step.from) return;
  let take: Step[] = [];
  if (!step.paid) {
    const need = a.cost?.discardFromHand ?? 0;
    const chosen = step.discards ?? [];
    if (chosen.length < need) {
      const opts = inv(game, step.inv).hand.filter((h) => h !== step.card && !chosen.includes(h));
      const pick = ask<InstId>(
        game,
        step,
        step.inv,
        CHOICE.Generic,
        `Choose a card to discard (cost of ${def(game, step.card).name})`,
        opts.map((h) => ({ id: h, label: def(game, h).name, card: h, value: h })),
        { key: "discardForCost", vars: { card: step.card } },
      );
      if (pick === undefined) return;
      push(game, { ...step, choice: undefined, discards: [...chosen, pick] });
      return;
    }
    for (const h of chosen) discard(game, h);
    recordUse(game, step.card, step.index, a, step.ctx?.inv);
    take = payCost(game, step.inv, step.card, a.cost);
  }
  const c = cardIf(game, step.card);
  const ctx: EffCtx = { ...step.ctx, source: step.card, you: step.ctx?.you ?? step.inv };
  if (c && c.zone === "location") ctx.location ??= c.id;
  // the tests of a parley action know it (Fine Clothes)
  if (a.designator === "parley") ctx.parley = true;
  emit(
    game,
    EVENT.Ability,
    `${invName(game, step.inv)} uses ${a.label ?? def(game, step.card).name}`,
    {
      inv: step.inv,
      card: step.card,
    },
  );
  // an asset whose last use this spent leaves play once the ability has resolved (its own modifiers still apply)
  const after: Step[] =
    !step.paid && a.cost?.uses ? [{ t: STEP.DiscardIfEmpty, card: step.card }] : [];
  // a cost that puts damage or horror on the asset itself can defeat it
  if (!step.paid && (a.cost?.damageOnSelf || a.cost?.horrorOnSelf))
    after.push({ t: STEP.AssetDefeatCheck, inv: step.inv });
  if (a.run)
    push(
      game,
      ...take,
      { t: STEP.Script, code: card(game, step.card).code, fn: a.run, ctx },
      ...after,
    );
  else if (a.effects) push(game, ...take, { t: STEP.Effects, effects: a.effects, ctx }, ...after);
  else push(game, ...take, ...after);
};

/** every ability of the card spends its uses and it has no constant ability: with no uses left it can do nothing */
export function spendsOnlyUses(d: CardDef): boolean {
  const abilities = d.abilities ?? [];
  return (
    abilities.length > 0 && abilities.every((a) => a.kind !== "constant" && (a.cost?.uses ?? 0) > 0)
  );
}

/**
 * Deliberate deviation from the printed rules: a used-up asset that can do nothing more is discarded (Flashlight,
 * .45 Automatic, Shrivelling), as are cards marked discardWhenEmpty.
 */
export const discardIfEmptyHandler: Handler<"DiscardIfEmpty"> = (game, step) => {
  const c = cardIf(game, step.card);
  if (!c || c.zone !== "play" || c.uses > 0) return;
  const d = def(game, step.card);
  // a card marked discardWhenEmpty: false stays (Flesh Ward still soaks a point with no charge)
  if (d.discardWhenEmpty === false || (!d.discardWhenEmpty && !spendsOnlyUses(d))) return;
  emit(game, EVENT.UsedUp, `${d.name} is used up`, {
    inv: c.controller ?? undefined,
    card: step.card,
  });
  discard(game, step.card);
};

// ---------- playing cards ----------
export function playCost(game: GameContext, i: InvId, cardId: InstId): number {
  const d = def(game, cardId);
  // an X the player chooses as they play it costs at least 0; any other X cost can't be played yet
  if (d.cost === "X") return d.costX ? 0 : Infinity;
  // a discount on this very card (Joe Diamond's revealed hunch: -2)
  let cost = (d.cost ?? 0) + (costMod.get(game, cardId) ?? 0);
  for (const m of allMods(game)) {
    if (m.target !== i || m.mod.stat !== "cost") continue;
    if (m.mod.filter && !matchesFilter(game, d.code, m.mod.filter)) continue;
    cost += m.mod.value ?? 0;
  }
  return Math.max(0, cost);
}

export const playAbility = (game: GameContext, cardId: InstId) =>
  abilitiesOf(game, cardId).find((a) => a.kind === "onPlay");

/** why an asset or event in hand can't be played whatever the timing, or null; `by` is the card that forbids it */
/** no asset or event may be played now, or no event (House in the Reeds) */
const playForbidden = (game: GameContext, i: InvId, cardId: InstId) =>
  offRole(game, i, cardId) ||
  hasFlag(game, i, "cannotPlayAssetsOrEvents") ||
  (def(game, cardId).type === "event" && hasFlag(game, i, "cannotPlayEvents")) ||
  allMods(game).some(
    (m) =>
      m.target === i &&
      m.mod.flag === "cannotPlay" &&
      (!m.mod.filter || matchesFilter(game, card(game, cardId).code, m.mod.filter)),
  );

/** the other investigators whose cards let them spend resources toward a card `i` plays (Charles Ross, Esq.) */
export function payHelpers(game: GameContext, i: InvId, cardId: InstId): InvId[] {
  const out = new Set<InvId>();
  for (const c of cardsIn(game, ZONE.Play))
    if (
      c.controller &&
      c.controller !== i &&
      scriptOf(game.db, c.code)?.paysFor?.(game, c.id, i, cardId)
    )
      out.add(c.controller);
  return [...out];
}
/** the resources that may go toward a card `i` plays: their own, and their helpers' */
const purse = (game: GameContext, i: InvId, cardId: InstId) =>
  payHelpers(game, i, cardId).reduce((n, h) => n + inv(game, h).resources, inv(game, i).resources);

export type PlayBlock =
  | { reason: "forbidden"; by: InstId | null }
  | { reason: "unique" }
  | { reason: "resources"; cost: number };

export function playBlock(game: GameContext, i: InvId, cardId: InstId): PlayBlock | null {
  const d = def(game, cardId);
  if (d.type !== "asset" && d.type !== "event") return null;
  const code = card(game, cardId).code;
  const ban = allMods(game).find(
    (m) =>
      m.target === i &&
      (m.mod.flag === "cannotPlayAssetsOrEvents" ||
        (m.mod.flag === "cannotPlayEvents" && d.type === "event") ||
        (m.mod.flag === "cannotPlayAssets" &&
          d.type === "asset" &&
          (!m.mod.filter || matchesFilter(game, code, m.mod.filter))) ||
        ((m.mod.flag === "cannotPlayOrCommit" || m.mod.flag === "cannotPlay") &&
          (!m.mod.filter || matchesFilter(game, code, m.mod.filter)))),
  );
  if (ban)
    return { reason: "forbidden", by: ban.source && cardIf(game, ban.source) ? ban.source : null };
  // not of Lola Hayes's role: her own card forbids it
  if (offRole(game, i, cardId)) return { reason: "forbidden", by: inv(game, i).cardId };
  if (uniqueInPlay(game, cardId)) return { reason: "unique" };
  const cost = playCost(game, i, cardId);
  if (purse(game, i, cardId) < cost) return { reason: "resources", cost };
  return null;
}

/** can the card be played from hand now, as an action (fast=false) or fast */
export function canPlay(game: GameContext, i: InvId, cardId: InstId, asFast: boolean): boolean {
  const d = def(game, cardId);
  if (d.type !== "asset" && d.type !== "event") return false;
  if (playForbidden(game, i, cardId)) return false;
  if (
    d.type === "asset" &&
    allMods(game).some(
      (m) =>
        m.target === i &&
        m.mod.flag === "cannotPlayAssets" &&
        (!m.mod.filter || matchesFilter(game, card(game, cardId).code, m.mod.filter)),
    )
  )
    return false;
  if (d.type === "asset" && noRoomFor(game, i, cardId)) return false;
  if (cardBlocked(game, i, cardId)) return false;
  if (uniqueInPlay(game, cardId)) return false;
  // "Limit 1 per investigator": no second copy (by title) of the asset in your play area
  if (
    d.type === "asset" &&
    /^Limit 1 per investigator\./m.test(d.text) &&
    controlled(game, i).some((c) => c.id !== cardId && def(game, c.id).name === d.name)
  )
    return false;
  // "Limit 1 [[Composure]] in play": no second asset of the trait in your play area (limits are per player)
  const traitLimit = d.type === "asset" ? /Limit 1 \[\[([\w ]+)\]\] in play\./.exec(d.text) : null;
  if (
    traitLimit &&
    controlled(game, i).some(
      (c) => c.id !== cardId && def(game, c.id).traits.includes(traitLimit[1]),
    )
  )
    return false;
  const isFast = d.keywords.includes("fast");
  if (asFast !== isFast) return false;
  // events that are only playable in response to a trigger
  const pa = playAbility(game, cardId);
  if (d.type === "event" && !pa) return false;
  if (pa?.condition && !checkCondition(game, pa.condition, { source: cardId, you: i }))
    return false;
  if (isFast && activeInvestigator(game) !== i && !(pa?.condition && "phase" in pa.condition))
    return false; // fast cards in own turn
  return purse(game, i, cardId) >= playCost(game, i, cardId);
}

export const playCardHandler: Handler<"PlayCard"> = (game, step) => {
  const d = def(game, step.card);
  const me = inv(game, step.inv);
  const c = card(game, step.card);
  // an X cost: the player chooses X, up to their resources (Jenny's Twin .45s)
  if (d.cost === "X" && d.costX === "uses" && step.x === undefined) {
    const x = ask<number>(
      game,
      step,
      step.inv,
      CHOICE.Generic,
      `${d.name}: choose X`,
      Array.from({ length: me.resources + 1 }, (_, n) => ({
        id: String(n),
        label: `X = ${n}`,
        value: n,
        key: "option.costX",
        vars: { n },
      })),
      { key: "costX", vars: { card: step.card } },
    );
    if (x === undefined) return;
    push(game, { ...step, choice: undefined, x });
    return;
  }
  const paid = step.free ? 0 : (step.x ?? playCost(game, step.inv, step.card));
  // another investigator may pay part of it, at least what the player can't (Charles Ross, Esq.)
  const helper = paid > 0 && !step.helped ? payHelpers(game, step.inv, step.card)[0] : undefined;
  if (helper) {
    const lo = Math.max(0, paid - me.resources);
    const hi = Math.min(paid, inv(game, helper).resources);
    const n =
      hi > lo
        ? ask<number>(
            game,
            step,
            helper,
            CHOICE.Generic,
            `${invName(game, helper)}: spend resources toward ${d.name}?`,
            Array.from({ length: hi - lo + 1 }, (_, k) => ({
              id: String(lo + k),
              label: `Spend ${lo + k}`,
              value: lo + k,
              key: "option.spendN",
              vars: { n: lo + k },
            })),
            { key: "helpPay", vars: { card: step.card } },
          )
        : lo;
    if (n === undefined) return;
    push(game, { ...step, choice: undefined, helped: { inv: helper, n } });
    return;
  }
  // a card played from beneath a card in play: that card exhausts, the additional cost to play it (Stick to the Plan)
  if (c.zone === ZONE.Beneath && c.location && cardIf(game, c.location)?.zone === ZONE.Play)
    exhaust(game, c.location);
  const helped = step.helped?.n ?? 0;
  if (step.helped) addCounter(game, step.helped.inv, "resources", -helped);
  addCounter(game, me.id, "resources", -(paid - helped));
  // a reduction "of the next card you play" is spent by this one (Improvisation)
  endNextPlayMods(game, step.inv, c.code);
  emit(game, EVENT.Play, `${me.name} plays ${d.name}`, { inv: step.inv, card: step.card });
  // after the card resolves (Syndicate Obligations)
  if (paid > 0) push(game, win("resourcesSpent", { inv: step.inv, card: step.card, amount: paid }));
  const ctx: EffCtx = { ...step.ctx, source: step.card, you: step.inv };
  if (d.type === "asset") {
    moveCard(game, step.card, ZONE.Limbo);
    setController(game, c.id, step.inv);
    push(
      game,
      { t: STEP.SlotCheck, inv: step.inv, card: step.card },
      {
        t: STEP.EnterPlay,
        inv: step.inv,
        card: step.card,
        ...(d.costX === "uses" ? { uses: step.x ?? 0 } : {}),
      },
      win("cardPlayed", { inv: step.inv, card: step.card }),
    );
    return;
  }
  // event
  moveCard(game, step.card, ZONE.Resolving);
  setController(game, c.id, step.inv);
  const a = step.viaTrigger
    ? (abilitiesOf(game, step.card).find((x) => x.fromHand) ?? playAbility(game, step.card))
    : playAbility(game, step.card);
  const after: Step = { t: STEP.FinishEvent, ctx: { source: step.card, you: step.inv } };
  // "when you play an event" may cancel it before it resolves (Painful Reflection); cancelled, it is only discarded
  const unless = `event:${step.card}`;
  push(
    game,
    win("eventWouldResolve", { inv: step.inv, card: step.card, key: unless }),
    a?.run
      ? { t: STEP.Script, code: c.code, fn: a.run, ctx, unless }
      : { t: STEP.Effects, effects: a?.effects ?? [], ctx, unless },
    after,
    win("cardPlayed", { inv: step.inv, card: step.card }),
  );
};

/** after an event resolves, discard it unless an effect moved it */
export function finishEvent(game: GameContext, ctx: EffCtx) {
  const c = cardIf(game, ctx.source!);
  if (c?.zone !== "resolving") return;
  // e.g. Wendy's Amulet puts events on the bottom of the deck instead
  for (const a of controlled(game, ctx.you!))
    fireCardHook(game, a.code, "eventFinished", { source: a.id, you: ctx.you, card: c.id }, c.id);
  if (c.zone === "resolving") discard(game, c.id);
}

export const enterPlayHandler: Handler<"EnterPlay"> = (game, step) => {
  const c = card(game, step.card);
  const d = def(game, step.card);
  moveCard(game, step.card, ZONE.Play);
  setController(game, c.id, step.inv);
  // charges beyond the printed count (Akachi Onyele)
  const extra = d.uses?.type === "charges" ? modSum(game, step.inv, "extraCharges") : 0;
  if (step.uses !== undefined) setCounter(game, c.id, "uses", step.uses + extra);
  else if (d.uses) setCounter(game, c.id, "uses", d.uses.count + extra);
  push(game, win("enterPlay", { inv: step.inv, card: step.card }));
};

// ---------- slots ----------
const SLOT_BASE: Record<Slot, number> = {
  hand: 2,
  arcane: 2,
  accessory: 1,
  body: 1,
  ally: 1,
  tarot: 1,
  head: 1,
};
const SLOT_MOD = {
  hand: "handSlots",
  arcane: "arcaneSlots",
  ally: "allySlots",
  accessory: "accessorySlots",
  body: "bodySlots",
  tarot: null,
  head: null,
} as const;

/** the assets an investigator's slots hold: those they control in their play area or threat area */
const slotted = (game: GameContext, i: InvId) =>
  [...cardsIn(game, ZONE.Play), ...cardsIn(game, ZONE.Threat)].filter(
    (c) => c.controller === i && def(game, c.id).type === "asset",
  );

/** returns a slot type that is over capacity, if any; `incoming` counts once whether or not it is in play already */
export function overfullSlot(game: GameContext, i: InvId, incoming: InstId | null): Slot | null {
  const assets = slotted(game, i).map((c) => c.id);
  if (incoming && !assets.includes(incoming)) assets.push(incoming);
  const mods = allMods(game).filter((m) => m.target === i);
  for (const slot of Object.keys(SLOT_BASE) as Slot[]) {
    const statName = SLOT_MOD[slot];
    let general = SLOT_BASE[slot];
    const restricted: { filter: NonNullable<(typeof mods)[number]["mod"]["filter"]>; n: number }[] =
      [];
    for (const m of mods) {
      if (!statName || m.mod.stat !== statName) continue;
      if (m.mod.filter) restricted.push({ filter: m.mod.filter, n: m.mod.value ?? 0 });
      else general += m.mod.value ?? 0;
    }
    let overflow = 0;
    for (const a of assets) {
      const need = def(game, a).slots.filter((s) => s === slot).length;
      for (let k = 0; k < need; k++) {
        const r = restricted.find(
          (x) => x.n > 0 && matchesFilter(game, card(game, a).code, x.filter),
        );
        if (r) r.n--;
        else if (general > 0) general--;
        else overflow++;
      }
    }
    if (overflow > 0) return slot;
  }
  return null;
}

/** the slots the asset needs are taken by what isn't an asset of theirs (Straitjacket): no asset can make room */
function noRoomFor(game: GameContext, i: InvId, cardId: InstId): boolean {
  const slot = overfullSlot(game, i, cardId);
  return (
    !!slot && !slotted(game, i).some((c) => c.id !== cardId && def(game, c.id).slots.includes(slot))
  );
}

export const slotCheckHandler: Handler<"SlotCheck"> = (game, step) => {
  const slot = overfullSlot(game, step.inv, step.card);
  if (!slot) return;
  // another asset makes room for the new one: the one being played or taken is never discarded for itself
  const victims = slotted(game, step.inv).filter(
    (c) => c.id !== step.card && def(game, c.id).slots.includes(slot),
  );
  // none can: the new one can't stay in play (an asset put into play while a Straitjacket holds the slots)
  if (!victims.length) {
    if (step.card && cardIf(game, step.card)?.zone === ZONE.Play) discard(game, step.card);
    return;
  }
  const pick = ask<InstId>(
    game,
    step,
    step.inv,
    CHOICE.Generic,
    `Not enough ${slot} slots: choose an asset to discard`,
    victims.map((v) => ({ id: v.id, label: def(game, v.id).name, card: v.id, value: v.id })),
    { auto: true, key: "slots", vars: { slot } },
  );
  if (pick === undefined) return;
  discard(game, pick);
  push(game, { ...step, choice: undefined });
};

export { canPay, modSum };

export const handlers = {
  FinishEvent: (game: GameContext, step: StepOf<"FinishEvent">) => finishEvent(game, step.ctx),
  Window: windowHandler,
  UseAbility: useAbilityHandler,
  DiscardIfEmpty: discardIfEmptyHandler,
  PlayCard: playCardHandler,
  EnterPlay: enterPlayHandler,
  SlotCheck: slotCheckHandler,
};
