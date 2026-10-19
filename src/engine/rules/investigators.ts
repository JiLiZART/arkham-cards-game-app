import { shuffle } from "../rng";
import {
  logStep,
  activeInvs, ask, card, cardsIn, connections, controlled, def, emit, engagedWith, enemies, hasFlag, inv, invName,
  isMassive, maxHealth, maxSanity, moveCard, playerCount, push, tapToDraw, type G,
} from "../core";
import type { InstId, InvId, Step } from "../types";
import { win } from "./cards";

type Handler<T extends Step["t"]> = (g: G, step: Extract<Step, { t: T }>) => void;

// ---------- drawing ----------
export const drawHandler: Handler<"Draw"> = (g, step) => {
  const me = inv(g, step.inv);
  if (me.status !== "playing" || step.n <= 0) return;
  // one tap covers a draw of several cards: the cards after the first go on without asking again
  if (!step.tapped && !tapToDraw(g, step, step.inv, "player", step.n)) return;
  if (me.deck.length === 0) {
    // empty deck: shuffle discard into deck, take 1 horror
    me.deck.push(...me.discard.splice(0));
    shuffle(g.s, me.deck);
    emit(g, "reshuffle", `${me.name} shuffles their discard pile into their deck and takes 1 horror`, { inv: step.inv, data: { horror: 1 } });
    push(g, { t: "AssignDamage", inv: step.inv, damage: 0, horror: 1, direct: true, source: null }, step);
    return;
  }
  const id = me.deck[0];
  const d = def(g, id);
  moveCard(g, id, "hand");
  const weakness = !!d.subtype && (d.type === "treachery" || d.type === "enemy");
  // a weakness that resolves on draw is public and announced as such (the table shows it before it resolves)
  if (weakness) emit(g, "weakness", `${me.name} draws the weakness ${d.name}`, { inv: step.inv, card: id });
  else emit(g, "draw", `${me.name} draws ${d.subtype ? d.name : "a card"}`, { inv: step.inv, card: id });
  const rest: Step[] = step.n > 1 ? [{ t: "Draw", inv: step.inv, n: step.n - 1, tapped: true }] : [];
  if (weakness) {
    // weaknesses resolve immediately
    if (d.type === "enemy") push(g, { t: "Spawn", enemy: id, inv: step.inv }, ...rest);
    else push(g, { t: "Revelation", inv: step.inv, card: id }, ...rest);
    return;
  }
  push(g, ...rest);
};

// ---------- damage & horror ----------
/** assets that can soak damage (health) or horror (sanity) */
function soakers(g: G, i: InvId, kind: 0 | 1, assigned: Record<string, [number, number]>) {
  return controlled(g, i).filter((c) => {
    const d = def(g, c.id);
    const cap = kind === 0 ? d.health : d.sanity;
    if (!cap) return false;
    const already = (kind === 0 ? c.damage : c.horror) + (assigned[c.id]?.[kind] ?? 0);
    return already < cap;
  });
}

export const assignDamageHandler: Handler<"AssignDamage"> = (g, step) => {
  const me = inv(g, step.inv);
  if (me.status !== "playing") return;
  const assigned = { ...(step.assigned ?? {}) };
  let { damage, horror } = step;
  // what the attack's window prevented comes off once, before the first point is placed
  const prevented = step.key ? (g.s.flags[`prevented:${step.key}`] as [number, number] | undefined) : undefined;
  if (prevented) {
    delete g.s.flags[`prevented:${step.key}`];
    damage = Math.max(0, damage - prevented[0]);
    horror = Math.max(0, horror - prevented[1]);
    if (!damage && !horror) return;
  }
  // pending answer: assign one point
  if (step.choice !== undefined) {
    const kind = damage > 0 ? 0 : 1;
    const cur = assigned[step.choice] ?? [0, 0];
    assigned[step.choice] = kind === 0 ? [cur[0] + 1, cur[1]] : [cur[0], cur[1] + 1];
    if (kind === 0) damage--;
    else horror--;
  }
  while (damage > 0 || horror > 0) {
    const kind: 0 | 1 = damage > 0 ? 0 : 1;
    const assets = step.direct ? [] : soakers(g, step.inv, kind, assigned);
    if (assets.length === 0) {
      const cur = assigned[step.inv] ?? [0, 0];
      assigned[step.inv] = kind === 0 ? [cur[0] + damage, cur[1]] : [cur[0], cur[1] + horror];
      if (kind === 0) damage = 0;
      else horror = 0;
      continue;
    }
    const label = kind === 0 ? "damage" : "horror";
    const opts = [
      { id: step.inv, label: `${me.name} (investigator)`, card: me.cardId, value: step.inv },
      ...assets.map((a) => ({ id: a.id, label: def(g, a.id).name, card: a.id, value: a.id })),
    ];
    const next: Step = { ...step, damage, horror, assigned, choice: undefined };
    ask(g, next, step.inv, "assign", `${me.name}: assign 1 ${label} (${kind === 0 ? damage : horror} left)`, opts, { key: kind === 0 ? "assignDamage" : "assignHorror", vars: { left: kind === 0 ? damage : horror } });
    return;
  }
  // apply
  const touchedAssets: InstId[] = [];
  let invDamage = 0;
  let invHorror = 0;
  for (const [target, [d, h]] of Object.entries(assigned)) {
    if (target === step.inv) {
      me.damage += d;
      me.horror += h;
      invDamage += d;
      invHorror += h;
    } else {
      const c = card(g, target);
      c.damage += d;
      c.horror += h;
      if (d > 0 || h > 0) touchedAssets.push(target);
      emit(g, "assetDamage", `${def(g, target).name} takes ${d} damage, ${h} horror`, { card: target, inv: step.inv, data: { damage: d, horror: h, source: step.source } });
    }
  }
  if (invDamage || invHorror) {
    emit(g, "damage", `${me.name} takes ${invDamage} damage and ${invHorror} horror`, { inv: step.inv, data: { damage: invDamage, horror: invHorror, source: step.source } });
  }
  push(g, { t: "AfterDamage", inv: step.inv, damage: invDamage, horror: invHorror, assets: touchedAssets, enemy: step.enemy ?? null });
};

export const afterDamageHandler: Handler<"AfterDamage"> = (g, step) => {
  const steps: Step[] = [];
  const enemy = step.enemy;
  for (const a of step.assets) {
    const c = g.s.cards[a];
    if (!c || c.zone !== "play") continue;
    if (enemy && c.damage > 0) steps.push(win("assetDamaged", { inv: step.inv, card: a, enemy }));
  }
  // asset defeat
  steps.push({ t: "Script", code: "__engine", fn: "assetDefeatCheck", ctx: { you: step.inv } });
  if (step.horror > 0) steps.push(win("horrorPlaced", { inv: step.inv, amount: step.horror }));
  if (step.damage > 0) steps.push(win("damageTaken", { inv: step.inv, amount: step.damage }));
  if (step.horror > 0) steps.push(win("horrorTaken", { inv: step.inv, amount: step.horror }));
  steps.push({ t: "CheckDefeat", inv: step.inv });
  push(g, ...steps);
};

export function assetDefeatCheck(g: G, i: InvId) {
  for (const c of controlled(g, i)) {
    const d = def(g, c.id);
    if ((d.health && c.damage >= d.health) || (d.sanity && c.horror >= d.sanity)) {
      emit(g, "assetDefeated", `${d.name} is defeated`, { card: c.id });
      moveCard(g, c.id, c.owner ? "discard" : "encounterDiscard", { inv: c.owner });
    }
  }
}

export const checkDefeatHandler: Handler<"CheckDefeat"> = (g, step) => {
  const me = inv(g, step.inv);
  if (me.status !== "playing") return;
  if (me.damage >= maxHealth(g, step.inv)) push(g, { t: "Defeated", inv: step.inv, by: "damage" });
  else if (me.horror >= maxSanity(g, step.inv)) push(g, { t: "Defeated", inv: step.inv, by: "horror" });
};

export const defeatedHandler: Handler<"Defeated"> = (g, step) => {
  const me = inv(g, step.inv);
  if (me.status !== "playing") return;
  me.status = step.by === "resign" ? "resigned" : "defeated";
  if (step.by !== "resign") {
    me.defeatedBy = step.by;
    if (step.by === "damage") me.physicalTrauma++;
    else me.mentalTrauma++;
  }
  emit(g, step.by === "resign" ? "resign" : "defeated", step.by === "resign" ? `${me.name} resigns` : `${me.name} is defeated (${step.by === "damage" ? "physical" : "mental"} trauma)`, { inv: step.inv, data: { by: step.by } });
  // clues drop at location
  if (me.location && me.clues) card(g, me.location).clues += me.clues;
  me.clues = 0;
  // engaged enemies stay at the location, unengaged
  for (const e of enemies(g)) if (e.engagedWith === step.inv) e.engagedWith = null;
  // cards leave play: owned cards out of the game, encounter cards to encounter discard
  for (const c of Object.values(g.s.cards)) {
    if (c.owner === step.inv && c.zone !== "removed" && c.zone !== "investigator") moveCard(g, c.id, "removed");
    else if (!c.owner && c.controller === step.inv && (c.zone === "threat" || c.zone === "play")) moveCard(g, c.id, "encounterDiscard");
  }
  me.location = null;
  if (g.s.active === step.inv) g.s.active = null;
  if (activeInvs(g).length === 0) push(g, { t: "Script", code: "__engine", fn: "allEliminated", ctx: {} });
};

// ---------- movement ----------
export function canMoveTo(g: G, i: InvId, to: InstId) {
  const from = inv(g, i).location;
  return !!from && connections(g, from).includes(to) && !hasFlag(g, to, "cannotMoveInto");
}

export const moveHandler: Handler<"Move"> = (g, step) => {
  const key = step.key ?? `move${g.s.seq++}`;
  const from = inv(g, step.inv).location;
  push(
    g,
    ...(from ? [win("wouldMoveOut", { inv: step.inv, location: from, key }), win("leaveLocation", { inv: step.inv, location: from, key })] : []),
    { t: "Arrive", inv: step.inv, to: step.to, key },
  );
};

export const arriveHandler: Handler<"Arrive"> = (g, step) => {
  if (step.key && g.s.cancelled.includes(step.key)) return;
  const me = inv(g, step.inv);
  if (me.status !== "playing") return;
  const from = me.location;
  me.location = step.to;
  // engaged enemies move with the investigator (massive ones engage everyone at their location)
  for (const e of enemies(g)) if (e.engagedWith === step.inv && !isMassive(g, e.id)) e.location = step.to;
  emit(g, "move", `${me.name} moves to ${def(g, step.to).name}`, { inv: step.inv, card: step.to, data: { from } });
  const steps: Step[] = [];
  const loc = card(g, step.to);
  if (!loc.revealed) steps.push({ t: "Script", code: "__engine", fn: "revealLocation", ctx: { location: step.to } });
  steps.push(win("enterLocation", { inv: step.inv, location: step.to }));
  steps.push({ t: "Script", code: "__engine", fn: "checkEngagement", ctx: { inv: step.inv } });
  steps.push({ t: "CheckObjectives" });
  push(g, ...steps);
};

export function revealLocation(g: G, loc: InstId) {
  const c = card(g, loc);
  if (c.revealed) return;
  c.revealed = true;
  const d = def(g, loc);
  c.clues += (d.clues ?? 0) * (d.cluesPerInvestigator ? playerCount(g) : 1);
  emit(g, "reveal", `${d.name} is revealed (${c.clues} clues)`, { card: loc, data: { n: c.clues } });
}

/** ready unengaged non-aloof enemies at an investigator's location engage them */
export function checkEngagement(g: G, i: InvId) {
  const me = inv(g, i);
  if (me.status !== "playing") return;
  for (const e of enemies(g)) {
    if (e.location !== me.location || e.engagedWith || e.exhausted) continue;
    if (def(g, e.id).keywords.includes("aloof") || isMassive(g, e.id)) continue;
    e.engagedWith = i;
    emit(g, "engage", `${def(g, e.id).name} engages ${me.name}`, { inv: i, card: e.id });
    push(g, win("enemyEngages", { inv: i, enemy: e.id }));
  }
}

// ---------- clues ----------
export const discoverCluesHandler: Handler<"DiscoverClues"> = (g, step) => {
  const loc = card(g, step.location);
  const n = Math.min(step.n, loc.clues);
  if (n <= 0 || hasFlag(g, step.inv, "cannotDiscoverClues")) return;
  const key = `clues${g.s.seq++}`;
  push(g, win("wouldDiscoverClues", { inv: step.inv, location: step.location, key, amount: n }), { t: "GainClues", inv: step.inv, location: step.location, n, key });
};

export const gainCluesHandler: Handler<"GainClues"> = (g, step) => {
  if (g.s.cancelled.includes(step.key)) return;
  const loc = card(g, step.location);
  const n = Math.min(step.n, loc.clues);
  loc.clues -= n;
  inv(g, step.inv).clues += n;
  emit(g, "clues", `${invName(g, step.inv)} discovers ${n} clue${n === 1 ? "" : "s"} at ${def(g, step.location).name}`, { inv: step.inv, card: step.location, data: { n } });
};

// ---------- setup helpers ----------
export const mulliganHandler: Handler<"Mulligan"> = (g, step) => {
  const me = inv(g, step.inv);
  const chosen = step.chosen ?? [];
  const opts = me.hand.filter((h) => !chosen.includes(h));
  const pick = ask<string | { unpick: InstId }>(g, step, step.inv, "mulligan", `${me.name}: mulligan — choose cards to redraw (${chosen.length} chosen)`, [
    { id: "done", label: chosen.length ? `Redraw ${chosen.length} card(s)` : "Keep hand", value: "done" },
    ...(chosen.length < 5 ? opts.map((h) => ({ id: h, label: def(g, h).name, card: h, value: h })) : []),
    ...chosen.map((h) => ({ id: `un:${h}`, label: `Take back ${def(g, h).name}`, card: h, value: { unpick: h } })),
  ], { key: "mulligan", vars: { n: chosen.length } });
  if (pick === undefined) return;
  if (typeof pick === "object") {
    push(g, { ...step, choice: undefined, chosen: chosen.filter((h) => h !== pick.unpick) });
    return;
  }
  if (pick !== "done") {
    push(g, { ...step, choice: undefined, chosen: [...chosen, pick] });
    return;
  }
  for (const h of chosen) moveCard(g, h, "limbo");
  drawOpeningCards(g, step.inv, chosen.length);
  for (const h of chosen) moveCard(g, h, "deck");
  shuffle(g.s, me.deck);
  // weaknesses set aside during opening draw go back in
  const aside = (g.s.flags[`aside:${step.inv}`] as InstId[] | undefined) ?? [];
  for (const h of aside) moveCard(g, h, "deck");
  if (aside.length) shuffle(g.s, me.deck);
  delete g.s.flags[`aside:${step.inv}`];
  if (chosen.length) emit(g, "mulligan", `${me.name} redraws ${chosen.length} card(s)`, { inv: step.inv, data: { n: chosen.length } });
};

/** draw n opening cards, setting weaknesses aside and replacing them */
export function drawOpeningCards(g: G, i: InvId, n: number) {
  const me = inv(g, i);
  const aside = ((g.s.flags[`aside:${i}`] as InstId[] | undefined) ?? []).slice();
  let drawn = 0;
  while (drawn < n && me.deck.length) {
    const id = me.deck[0];
    if (def(g, id).subtype) {
      moveCard(g, id, "setAside");
      aside.push(id);
      continue;
    }
    moveCard(g, id, "hand");
    drawn++;
  }
  g.s.flags[`aside:${i}`] = aside;
}

/** most cards an investigator keeps at the end of upkeep */
export const HAND_LIMIT = 8;

export const handSizeHandler: Handler<"HandSize"> = (g, step) => {
  const me = inv(g, step.inv);
  if (me.status !== "playing") return;
  const excess = me.hand.length - HAND_LIMIT;
  if (excess <= 0) return;
  if (!step.stepped && step.choice === undefined) logStep(g, "handSize", step.inv);
  const pick = ask<InstId>(g, step, step.inv, "generic", `${me.name}: discard down to ${HAND_LIMIT} cards (${excess} more)`,
    me.hand.map((h) => ({ id: h, label: def(g, h).name, card: h, value: h })), { key: "discardDown", vars: { n: excess } });
  if (pick === undefined) return;
  moveCard(g, pick, "discard");
  emit(g, "discard", `${me.name} discards ${def(g, pick).name}`, { inv: step.inv, card: pick });
  push(g, { ...step, choice: undefined, stepped: true });
};

export { cardsIn, engagedWith };

export const handlers = {
  Draw: drawHandler,
  AssignDamage: assignDamageHandler,
  AfterDamage: afterDamageHandler,
  CheckDefeat: checkDefeatHandler,
  Defeated: defeatedHandler,
  Move: moveHandler,
  Arrive: arriveHandler,
  DiscoverClues: discoverCluesHandler,
  GainClues: gainCluesHandler,
  Mulligan: mulliganHandler,
  HandSize: handSizeHandler,
};
