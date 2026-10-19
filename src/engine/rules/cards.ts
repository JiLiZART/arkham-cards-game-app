import type { Ability, CardDef, Cost, Slot, Trigger } from "../../content/schema";
import {
  abilitiesOf, activeInvs, allMods, ask, blankedCards, card, checkCondition, controlled, def, discard, emit, hasFlag, inv, invName, invsAt,
  matchesFilter, modSum, moveCard, playerCount, push, type G,
} from "../core";
import type { EffCtx, EventData, InstId, InvId, Step } from "../types";

type Handler<T extends Step["t"]> = (g: G, step: Extract<Step, { t: T }>) => void;

// ---------- limits ----------
function periodKey(g: G, per: "test" | "turn" | "phase" | "round" | "game") {
  return per === "game" ? "game" : `${per}${g.s.counters[per]}`;
}
function limitKey(g: G, cardId: InstId, index: number, a: Ability) {
  const c = card(g, cardId);
  const who = a.limit?.group ? c.code : cardId;
  return `${who}:${index}:${periodKey(g, a.limit!.per)}`;
}
export function withinLimit(g: G, cardId: InstId, index: number, a: Ability) {
  if (!a.limit) return true;
  return (g.s.usage[limitKey(g, cardId, index, a)] ?? 0) < a.limit.count;
}
function recordUse(g: G, cardId: InstId, index: number, a: Ability) {
  if (!a.limit) return;
  const k = limitKey(g, cardId, index, a);
  g.s.usage[k] = (g.s.usage[k] ?? 0) + 1;
}

// ---------- costs ----------
export function canPay(g: G, i: InvId, cardId: InstId, cost: Cost | undefined): boolean {
  if (!cost) return true;
  const c = card(g, cardId);
  const me = inv(g, i);
  if (cost.exhaust && c.exhausted) return false;
  if (cost.uses && c.uses < cost.uses) return false;
  if (cost.resources && me.resources < cost.resources) return false;
  if (cost.clues && (me.clues < cost.clues || hasFlag(g, i, "cannotSpendClues"))) return false;
  if (cost.cluesPerInvestigator) {
    const total = activeInvs(g).reduce((n, x) => n + inv(g, x).clues, 0);
    if (total < cost.cluesPerInvestigator * playerCount(g)) return false;
  }
  if (cost.discardFromHand && me.hand.filter((h) => h !== cardId).length < cost.discardFromHand) return false;
  return true;
}

/** pay non-interactive costs (discarding from hand is chosen beforehand) */
function payCost(g: G, i: InvId, cardId: InstId, cost: Cost | undefined) {
  if (!cost) return;
  const c = card(g, cardId);
  const me = inv(g, i);
  if (cost.exhaust) c.exhausted = true;
  if (cost.uses) c.uses -= cost.uses;
  if (cost.resources) me.resources -= cost.resources;
  if (cost.clues) me.clues -= cost.clues;
  if (cost.cluesPerInvestigator) spendGroupClues(g, cost.cluesPerInvestigator * playerCount(g));
  if (cost.takeDamage) push(g, { t: "AssignDamage", inv: i, damage: cost.takeDamage, horror: 0, direct: true, source: cardId });
  if (cost.takeHorror) push(g, { t: "AssignDamage", inv: i, damage: 0, horror: cost.takeHorror, direct: true, source: cardId });
  if (cost.horrorOnSelf) c.horror += cost.horrorOnSelf;
  if (cost.damageOnSelf) c.damage += cost.damageOnSelf;
  if (cost.discardSelf) discard(g, cardId);
}

/** spend clues as a group, lead investigator first then player order */
export function spendGroupClues(g: G, n: number) {
  const order = [g.s.lead, ...activeInvs(g).filter((x) => x !== g.s.lead)];
  for (const i of order) {
    const take = Math.min(n, inv(g, i).clues);
    inv(g, i).clues -= take;
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

const ABILITY_ZONES = ["play", "threat", "attached", "location", "enemy", "act", "agenda", "investigator"];

/** who may use an ability of this card */
function usersOf(g: G, cardId: InstId, a: Ability): InvId[] {
  const c = card(g, cardId);
  const by = a.usableBy ?? (c.controller ? "controller" : "atLocation");
  if (by === "controller") return c.controller && inv(g, c.controller).status === "playing" ? [c.controller] : [];
  if (by === "anyone") return activeInvs(g);
  if (by === "engaged") return c.engagedWith ? [c.engagedWith] : [];
  const loc = c.zone === "location" ? c.id : c.zone === "enemy" || c.zone === "attached" ? c.location : c.controller ? inv(g, c.controller).location : null;
  if (c.zone === "act" || c.zone === "agenda") return activeInvs(g);
  return invsAt(g, loc);
}

/** activatable abilities ([action] or [fast]) the investigator could use now */
export function activatable(g: G, i: InvId, kinds: ("action" | "fast")[]): AbilityRef[] {
  const out: AbilityRef[] = [];
  const blanked = blankedCards(g);
  for (const c of Object.values(g.s.cards)) {
    if (!ABILITY_ZONES.includes(c.zone)) continue;
    if (c.zone === "location" && !c.revealed) continue;
    abilitiesOf(g, c.id, blanked).forEach((a, index) => {
      if (!kinds.includes(a.kind as "action" | "fast")) return;
      if (!usersOf(g, c.id, a).includes(i)) return;
      if (!withinLimit(g, c.id, index, a)) return;
      if (a.condition && !checkCondition(g, a.condition, { source: c.id, you: i, enemy: c.zone === "enemy" ? c.id : null })) return;
      if (!canPay(g, i, c.id, a.cost)) return;
      out.push({ card: c.id, index, ability: a, controller: i });
    });
  }
  return out;
}

// ---------- triggers ----------
/** triggers whose subject is a card; encounter cards only react to themselves */
function isSubject(g: G, cardId: InstId, data: EventData) {
  const c = card(g, cardId);
  return (
    data.card === cardId || data.enemy === cardId || data.location === cardId ||
    (c.zone === "attached" && !!data.location && c.location === data.location)
  );
}

function triggerMatches(g: G, cardId: InstId, a: Ability, you: InvId | null, data: EventData): boolean {
  const hasSubject = !!(data.card || data.enemy || data.location);
  if (!you) return isSubject(g, cardId, data) || !hasSubject;
  if (isSubject(g, cardId, data)) return true;
  if (!data.inv) return !hasSubject || a.usableBy === "anyone";
  if (data.inv === you) return true;
  if (a.usableBy === "anyone") return true;
  if (a.usableBy === "atLocation") return inv(g, data.inv).location === inv(g, you).location;
  return false;
}

export function ctxFor(data: EventData, source: InstId, you: InvId | null): EffCtx {
  return {
    source, you, inv: data.inv ?? null, enemy: data.enemy ?? null, location: data.location ?? null, key: data.key, card: data.card ?? null,
    token: data.token, testId: data.testId, failBy: data.margin !== undefined && data.margin < 0 ? -data.margin : undefined,
    succeedBy: data.margin !== undefined && data.margin >= 0 ? data.margin : undefined, x: data.amount,
    dealt: data.damage !== undefined || data.horror !== undefined ? [data.damage ?? 0, data.horror ?? 0] : undefined,
  };
}

function triggered(g: G, trigger: Trigger, data: EventData): AbilityRef[] {
  const out: AbilityRef[] = [];
  const blanked = blankedCards(g);
  const consider = (cardId: InstId, you: InvId | null, fromHand: boolean) => {
    abilitiesOf(g, cardId, blanked).forEach((a, index) => {
      if (a.trigger !== trigger || (a.kind !== "reaction" && a.kind !== "forced")) return;
      if (fromHand !== !!a.fromHand) return;
      if (!triggerMatches(g, cardId, a, you, data)) return;
      if (!withinLimit(g, cardId, index, a)) return;
      if (a.condition && !checkCondition(g, a.condition, ctxFor(data, cardId, you))) return;
      if (you && a.kind === "reaction" && !canPay(g, you, cardId, a.cost)) return;
      if (fromHand && you) {
        const cost = playCost(g, you, cardId);
        if (inv(g, you).resources < cost || hasFlag(g, you, "cannotPlayAssetsOrEvents")) return;
      }
      out.push({ card: cardId, index, ability: a, controller: you as InvId });
    });
  };
  for (const c of Object.values(g.s.cards)) {
    if (ABILITY_ZONES.includes(c.zone)) {
      if (c.zone === "location" && !c.revealed && trigger !== "enterLocation") continue;
      consider(c.id, c.controller ?? null, false);
    }
  }
  for (const i of activeInvs(g)) for (const h of inv(g, i).hand) consider(h, i, true);
  return out;
}

/** a timing window: forced abilities resolve, then players may use reactions */
export const windowHandler: Handler<"Window"> = (g, step) => {
  const refs = triggered(g, step.trigger, step.data);
  if (!step.forcedDone) {
    const forced = refs.filter((r) => r.ability.kind === "forced");
    push(
      g,
      ...forced.map((r): Step => ({ t: "UseAbility", inv: r.controller ?? g.s.lead, card: r.card, index: r.index, ctx: ctxFor(step.data, r.card, r.controller ?? null) })),
      { ...step, forcedDone: true, choice: undefined },
    );
    return;
  }
  const offered = step.offered ?? [];
  const reactions = refs.filter((r) => r.ability.kind === "reaction" && !offered.includes(`${r.card}:${r.index}`));
  if (reactions.length === 0) return;
  const who = reactions[0].controller;
  const mine = reactions.filter((r) => r.controller === who);
  const opts = [
    ...mine.map((r) => ({ id: `${r.card}:${r.index}`, label: r.ability.label ?? `${def(g, r.card).name}${r.ability.fromHand ? " (play)" : ""}`, card: r.card, value: `${r.card}:${r.index}` })),
    { id: "pass", label: "Pass", value: "pass" },
  ];
  const pick = ask<string>(g, step, who, "reaction", `${invName(g, who)}: use a reaction? (${step.trigger})`, opts, { key: "reaction" });
  if (pick === undefined) return;
  if (pick === "pass") {
    push(g, { ...step, choice: undefined, offered: [...offered, ...mine.map((r) => `${r.card}:${r.index}`)] });
    return;
  }
  const r = mine.find((x) => `${x.card}:${x.index}` === pick)!;
  push(
    g,
    r.ability.fromHand
      ? { t: "PlayCard", inv: who, card: r.card, ctx: ctxFor(step.data, r.card, who), viaTrigger: true }
      : { t: "UseAbility", inv: who, card: r.card, index: r.index, ctx: ctxFor(step.data, r.card, who) },
    { ...step, choice: undefined, offered: [...offered, pick] },
  );
};

export const win = (trigger: Trigger, data: EventData): Step => ({ t: "Window", trigger, data });

// ---------- using abilities ----------
export const useAbilityHandler: Handler<"UseAbility"> = (g, step) => {
  const a = abilitiesOf(g, step.card)[step.index];
  if (!a) return;
  if (!step.paid) {
    const need = a.cost?.discardFromHand ?? 0;
    const chosen = step.discards ?? [];
    if (chosen.length < need) {
      const opts = inv(g, step.inv).hand.filter((h) => h !== step.card && !chosen.includes(h));
      const pick = ask<InstId>(g, step, step.inv, "generic", `Choose a card to discard (cost of ${def(g, step.card).name})`,
        opts.map((h) => ({ id: h, label: def(g, h).name, card: h, value: h })), { key: "discardForCost", vars: { card: step.card } });
      if (pick === undefined) return;
      push(g, { ...step, choice: undefined, discards: [...chosen, pick] });
      return;
    }
    for (const h of chosen) discard(g, h);
    recordUse(g, step.card, step.index, a);
    payCost(g, step.inv, step.card, a.cost);
  }
  const c = g.s.cards[step.card];
  const ctx: EffCtx = { ...(step.ctx ?? {}), source: step.card, you: step.ctx?.you ?? step.inv };
  if (c && c.zone === "location") ctx.location ??= c.id;
  emit(g, "ability", `${invName(g, step.inv)} uses ${a.label ?? def(g, step.card).name}`, { inv: step.inv, card: step.card });
  // an asset whose last use this spent leaves play once the ability has resolved (its own modifiers still apply)
  const after: Step[] = !step.paid && a.cost?.uses ? [{ t: "DiscardIfEmpty", card: step.card }] : [];
  if (a.run) push(g, { t: "Script", code: card(g, step.card).code, fn: a.run, ctx }, ...after);
  else if (a.effects) push(g, { t: "Effects", effects: a.effects, ctx }, ...after);
  else push(g, ...after);
};

/** every ability of the card spends its uses and it has no constant ability: with no uses left it can do nothing */
export function spendsOnlyUses(d: CardDef): boolean {
  const abilities = d.abilities ?? [];
  return abilities.length > 0 && abilities.every((a) => a.kind !== "constant" && (a.cost?.uses ?? 0) > 0);
}

/**
 * Deliberate deviation from the printed rules: a used-up asset that can do nothing more is discarded (Flashlight,
 * .45 Automatic, Shrivelling), as are cards marked discardWhenEmpty.
 */
export const discardIfEmptyHandler: Handler<"DiscardIfEmpty"> = (g, step) => {
  const c = g.s.cards[step.card];
  if (!c || c.zone !== "play" || c.uses > 0) return;
  const d = def(g, step.card);
  // a card marked discardWhenEmpty: false stays (Flesh Ward still soaks a point with no charge)
  if (d.discardWhenEmpty === false || (!d.discardWhenEmpty && !spendsOnlyUses(d))) return;
  emit(g, "usedUp", `${d.name} is used up`, { inv: c.controller ?? undefined, card: step.card });
  discard(g, step.card);
};

// ---------- playing cards ----------
export function playCost(g: G, i: InvId, cardId: InstId): number {
  const d = def(g, cardId);
  let cost = d.cost ?? 0;
  for (const m of allMods(g)) {
    if (m.target !== i || m.mod.stat !== "cost") continue;
    if (m.mod.filter && !matchesFilter(g, d.code, m.mod.filter)) continue;
    cost += m.mod.value ?? 0;
  }
  return Math.max(0, cost);
}

const playAbility = (g: G, cardId: InstId) => abilitiesOf(g, cardId).find((a) => a.kind === "onPlay");

/** can the card be played from hand now, as an action (fast=false) or fast */
export function canPlay(g: G, i: InvId, cardId: InstId, asFast: boolean): boolean {
  const d = def(g, cardId);
  if (d.type !== "asset" && d.type !== "event") return false;
  if (hasFlag(g, i, "cannotPlayAssetsOrEvents")) return false;
  const isFast = d.keywords.includes("fast");
  if (asFast !== isFast) return false;
  // events that are only playable in response to a trigger
  const pa = playAbility(g, cardId);
  if (d.type === "event" && !pa) return false;
  if (pa?.condition && !checkCondition(g, pa.condition, { source: cardId, you: i })) return false;
  if (isFast && g.s.active !== i && !(pa?.condition && "phase" in pa.condition)) return false; // fast cards in own turn
  return inv(g, i).resources >= playCost(g, i, cardId);
}

export const playCardHandler: Handler<"PlayCard"> = (g, step) => {
  const d = def(g, step.card);
  const me = inv(g, step.inv);
  const c = card(g, step.card);
  if (!step.free) me.resources -= playCost(g, step.inv, step.card);
  emit(g, "play", `${me.name} plays ${d.name}`, { inv: step.inv, card: step.card });
  const ctx: EffCtx = { ...(step.ctx ?? {}), source: step.card, you: step.inv };
  if (d.type === "asset") {
    moveCard(g, step.card, "limbo");
    c.controller = step.inv;
    push(g, { t: "SlotCheck", inv: step.inv, card: step.card }, { t: "EnterPlay", inv: step.inv, card: step.card }, win("cardPlayed", { inv: step.inv, card: step.card }));
    return;
  }
  // event
  moveCard(g, step.card, "resolving");
  c.controller = step.inv;
  const a = step.viaTrigger ? abilitiesOf(g, step.card).find((x) => x.fromHand) : playAbility(g, step.card);
  const after: Step = { t: "Script", code: "__engine", fn: "finishEvent", ctx: { source: step.card, you: step.inv } };
  if (a?.run) push(g, { t: "Script", code: c.code, fn: a.run, ctx }, after, win("cardPlayed", { inv: step.inv, card: step.card }));
  else push(g, { t: "Effects", effects: a?.effects ?? [], ctx }, after, win("cardPlayed", { inv: step.inv, card: step.card }));
};

/** after an event resolves, discard it unless an effect moved it */
export function finishEvent(g: G, ctx: EffCtx) {
  const c = g.s.cards[ctx.source!];
  if (c?.zone !== "resolving") return;
  // e.g. Wendy's Amulet puts events on the bottom of the deck instead
  for (const a of controlled(g, ctx.you!)) g.db.scripts[a.code]?.hooks?.eventFinished?.(g, { ...ctx, card: c.id });
  if (c.zone === "resolving") discard(g, c.id);
}

export const enterPlayHandler: Handler<"EnterPlay"> = (g, step) => {
  const c = card(g, step.card);
  const d = def(g, step.card);
  moveCard(g, step.card, "play");
  c.controller = step.inv;
  if (d.uses) c.uses = d.uses.count;
  push(g, win("enterPlay", { inv: step.inv, card: step.card }));
};

// ---------- slots ----------
const SLOT_BASE: Record<Slot, number> = { hand: 2, arcane: 2, accessory: 1, body: 1, ally: 1, tarot: 1, head: 1 };
const SLOT_MOD = { hand: "handSlots", arcane: "arcaneSlots", ally: "allySlots", accessory: "accessorySlots", body: "bodySlots", tarot: null, head: null } as const;

/** returns a slot type that is over capacity, if any */
export function overfullSlot(g: G, i: InvId, incoming: InstId | null): Slot | null {
  const assets = controlled(g, i).map((c) => c.id);
  if (incoming) assets.push(incoming);
  const mods = allMods(g).filter((m) => m.target === i);
  for (const slot of Object.keys(SLOT_BASE) as Slot[]) {
    const statName = SLOT_MOD[slot];
    let general = SLOT_BASE[slot];
    const restricted: { filter: NonNullable<(typeof mods)[number]["mod"]["filter"]>; n: number }[] = [];
    for (const m of mods) {
      if (!statName || m.mod.stat !== statName) continue;
      if (m.mod.filter) restricted.push({ filter: m.mod.filter, n: m.mod.value ?? 0 });
      else general += m.mod.value ?? 0;
    }
    let overflow = 0;
    for (const a of assets) {
      const need = def(g, a).slots.filter((s) => s === slot).length;
      for (let k = 0; k < need; k++) {
        const r = restricted.find((x) => x.n > 0 && matchesFilter(g, card(g, a).code, x.filter));
        if (r) r.n--;
        else if (general > 0) general--;
        else overflow++;
      }
    }
    if (overflow > 0) return slot;
  }
  return null;
}

export const slotCheckHandler: Handler<"SlotCheck"> = (g, step) => {
  const slot = overfullSlot(g, step.inv, step.card);
  if (!slot) return;
  const victims = controlled(g, step.inv).filter((c) => def(g, c.id).slots.includes(slot));
  const pick = ask<InstId>(g, step, step.inv, "generic", `Not enough ${slot} slots: choose an asset to discard`,
    victims.map((v) => ({ id: v.id, label: def(g, v.id).name, card: v.id, value: v.id })), { auto: true, key: "slots", vars: { slot } });
  if (pick === undefined) return;
  discard(g, pick);
  push(g, { ...step, choice: undefined });
};

export { modSum };

export const handlers = {
  Window: windowHandler,
  UseAbility: useAbilityHandler,
  DiscardIfEmpty: discardIfEmptyHandler,
  PlayCard: playCardHandler,
  EnterPlay: enterPlayHandler,
  SlotCheck: slotCheckHandler,
};
