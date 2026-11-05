import {
  aside as asideFlag,
  dying,
  killed as killedFlag,
  prevented as preventedFlag,
  resignedWith,
  vehicleUsed,
} from "../world/flags";
import {
  abilitiesOf,
  allMods,
  canPlaceClues,
  cardsIn,
  connections,
  controlled,
  enemies,
  engagedWith,
  hasFlag,
  invsAt,
  isAloof,
  isMassive,
  matchesFilter,
  maxHealth,
  maxSanity,
  modSum,
  modsFor,
  spendableGroupClues,
  isHidden,
} from "../queries";
import {
  activeInvestigator,
  activeInvs,
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
  isCancelled,
  leadInvestigator,
  logLength,
  logStep,
  nextKey,
  placeInvestigator,
  currentActs,
  currentRound,
  currentTest,
  setVehicle,
  playerCount,
  push,
  reveal,
  setActive,
  setCardLocation,
  setCounter,
  setEngaged,
  setLead,
  setStatus,
  shuffleDeck,
  tapToDraw,
} from "../context";
import { isInPlay, moveCard, reshuffleDiscard } from "../movement";
import type { InstId, InvId, Step, StepOf } from "../world/types";
import { win } from "./cards";
import { preyCandidates } from "./enemies";
import { EVENT } from "../events/event";
import { ZONE, CHOICE, INV_STATUS, isOneOf } from "../world/constants";
import { STEP } from "../steps/step";
import { fireCardHook, fireGameEnd, fireScenarioHook } from "./scripts";

type Handler<T extends Step["t"]> = (game: GameContext, step: Extract<Step, { t: T }>) => void;

// ---------- drawing ----------
export const drawHandler: Handler<"Draw"> = (game, step) => {
  const me = inv(game, step.inv);
  if (me.status !== "playing" || step.n <= 0) return;
  // one tap covers a draw of several cards: the cards after the first go on without asking again
  if (!step.tapped && !tapToDraw(game, step, step.inv, "player", step.n)) return;
  if (me.deck.length === 0 && me.discard.length === 0) {
    // nothing to reshuffle: defeated at once with 1 mental trauma (Grimoire, Drawing Cards)
    emit(game, EVENT.EmptyDeck, `${me.name} must draw from an empty deck with no discard pile`, {
      inv: step.inv,
    });
    push(game, { t: STEP.Defeated, inv: step.inv, by: "horror" });
    return;
  }
  if (me.deck.length === 0) {
    // empty deck: shuffle discard into deck, take 1 horror
    reshuffleDiscard(game, step.inv);
    emit(
      game,
      EVENT.Reshuffle,
      `${me.name} shuffles their discard pile into their deck and takes 1 horror`,
      { inv: step.inv, data: { horror: 1 } },
    );
    push(
      game,
      { t: STEP.AssignDamage, inv: step.inv, damage: 0, horror: 1, direct: true, source: null },
      step,
    );
    return;
  }
  const id = me.deck[0];
  const d = def(game, id);
  moveCard(game, id, ZONE.Hand);
  const weakness = resolvesOnDraw(game, id);
  // a weakness that resolves on draw is public and announced as such (the table shows it before it resolves)
  if (weakness)
    emit(game, EVENT.Weakness, `${me.name} draws the weakness ${d.name}`, {
      inv: step.inv,
      card: id,
    });
  else
    emit(game, EVENT.Draw, `${me.name} draws ${d.subtype ? d.name : "a card"}`, {
      inv: step.inv,
      card: id,
    });
  const rest: Step[] =
    step.n > 1
      ? [{ t: STEP.Draw, inv: step.inv, n: step.n - 1, tapped: true, of: step.of ?? step.n }]
      : // "after an investigator draws 1 or more cards": once, when the draw is done (Oppressive Mists)
        [win("cardsDrawn", { inv: step.inv, amount: step.of ?? 1 })];
  // the last card drawn leaves the deck empty (Beyond the Veil)
  if (!inv(game, step.inv).deck.length) rest.unshift(win("deckEmptied", { inv: step.inv }));
  // "after you draw X" (Detective's Intuition)
  if (!weakness) rest.unshift(win("cardDrawn", { inv: step.inv, card: id }));
  if (weakness) {
    // weaknesses resolve immediately
    resolveWeakness(game, step.inv, id, ...rest);
    return;
  }
  push(game, ...rest);
};

/**
 * A weakness that resolves when drawn: an encounter-type one (resolved as if drawn from the encounter deck), or a
 * player-type one with a revelation, which then stays in hand (Grimoire, Weakness).
 */
export function resolvesOnDraw(game: GameContext, id: InstId): boolean {
  const d = def(game, id);
  return (
    !!d.subtype &&
    (d.type === "treachery" ||
      d.type === "enemy" ||
      abilitiesOf(game, id).some((a) => a.kind === "revelation"))
  );
}

/**
 * Resolve a weakness as if just drawn, then `after`: an enemy spawns, anything else resolves its revelation. Also for a
 * weakness put into a hand without being drawn, which "must resolve … as if they had just drawn it" (Grimoire, Weakness).
 */
export function resolveWeakness(game: GameContext, i: InvId, id: InstId, ...after: Step[]) {
  if (def(game, id).type === "enemy") push(game, { t: STEP.Spawn, enemy: id, inv: i }, ...after);
  else push(game, { t: STEP.Revelation, inv: i, card: id }, ...after);
}

// ---------- damage & horror ----------
/** assets that can soak damage (health) or horror (sanity) */
function soakers(
  game: GameContext,
  i: InvId,
  kind: 0 | 1,
  assigned: Record<string, [number, number]>,
) {
  const here = inv(game, i).location;
  // another investigator's asset that may be assigned damage (and horror: Brother Xavier) dealt at its location (Bodyguard)
  const guards = cardsIn(game, ZONE.Play).filter((c) => {
    const soaks = def(game, c.id).soaksForLocation;
    return (
      c.controller &&
      c.controller !== i &&
      (kind === 0 ? !!soaks : soaks === "damageAndHorror") &&
      inv(game, c.controller).location === here
    );
  });
  return [...controlled(game, i), ...guards].filter((c) => {
    const d = def(game, c.id);
    const cap = kind === 0 ? d.health : d.sanity;
    if (!cap) return false;
    const already = (kind === 0 ? c.damage : c.horror) + (assigned[c.id]?.[kind] ?? 0);
    return already < cap;
  });
}

export const assignDamageHandler: Handler<"AssignDamage"> = (game, step) => {
  const me = inv(game, step.inv);
  if (me.status !== "playing") return;
  const assigned = { ...step.assigned };
  let { damage, horror } = step;
  // what the attack's window prevented comes off once, before the first point is placed
  const prevented = step.key ? preventedFlag.take(game, step.key) : undefined;
  if (prevented) {
    damage = Math.max(0, damage - prevented[0]);
    horror = Math.max(0, horror - prevented[1]);
    if (!damage && !horror) return;
  }
  // what is about to be placed can still be cancelled, whatever dealt it (Delay the Inevitable)
  if (!step.windowed && (damage || horror)) {
    const key = step.key ?? `dmg:${step.inv}:${logLength(game)}`;
    push(
      game,
      win("damageDealt", { inv: step.inv, enemy: step.enemy ?? null, key, damage, horror }),
      {
        ...step,
        damage,
        horror,
        key,
        windowed: true,
      },
    );
    return;
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
    const direct = step.direct || hasFlag(game, step.inv, "directDamage");
    const assets = direct ? [] : soakers(game, step.inv, kind, assigned);
    // "must be assigned to your assets first, if able": the investigator takes none while an asset can
    const onlyAssets = !!step.assetsFirst && kind === 0 && assets.length > 0;
    if (assets.length === 0) {
      const cur = assigned[step.inv] ?? [0, 0];
      assigned[step.inv] = kind === 0 ? [cur[0] + damage, cur[1]] : [cur[0], cur[1] + horror];
      if (kind === 0) damage = 0;
      else horror = 0;
      continue;
    }
    const label = kind === 0 ? "damage" : "horror";
    // each option says what it does, and whether that point defeats the asset
    const word = kind === 0 ? "damage" : "horror";
    const key = kind === 0 ? "option.assignDamage" : "option.assignHorror";
    const opts = [
      ...(onlyAssets
        ? []
        : [
            {
              id: step.inv,
              label: `Assign 1 ${word} to ${me.name}`,
              card: me.cardId,
              value: step.inv,
              key,
              vars: { code: card(game, me.cardId).code, defeated: 0 },
            },
          ]),
      ...assets.map((a) => {
        const cap = (kind === 0 ? def(game, a.id).health : def(game, a.id).sanity) ?? 0;
        const defeated =
          (kind === 0 ? a.damage : a.horror) + (assigned[a.id]?.[kind] ?? 0) + 1 >= cap ? 1 : 0;
        return {
          id: a.id,
          label: `Assign 1 ${word} to ${def(game, a.id).name}${defeated ? " (defeated)" : ""}`,
          card: a.id,
          value: a.id,
          key,
          vars: { code: a.code, defeated },
        };
      }),
    ];
    const next: Step = { ...step, damage, horror, assigned, choice: undefined };
    // "as much damage and horror as possible to a single card before assigning it to another" (Beast of Aldebaran):
    // the card last assigned to takes the rest while it can
    const focus =
      step.enemy && hasFlag(game, step.enemy, "assignToSingleCard")
        ? Object.keys(assigned)
            .reverse()
            .find((id) => opts.some((o) => o.id === id))
        : undefined;
    // "divided as evenly as possible among eligible cards": only those holding the fewest points of it so far
    const fewest = Math.min(...opts.map((o) => assigned[o.id]?.[kind] ?? 0));
    const even = step.evenly ? opts.filter((o) => (assigned[o.id]?.[kind] ?? 0) === fewest) : opts;
    ask(
      game,
      next,
      step.inv,
      CHOICE.Assign,
      `${me.name}: assign 1 ${label} (${kind === 0 ? damage : horror} left)`,
      focus ? opts.filter((o) => o.id === focus) : even,
      {
        key: kind === 0 ? "assignDamage" : "assignHorror",
        vars: { left: kind === 0 ? damage : horror },
      },
    );
    return;
  }
  // apply
  const touchedAssets: InstId[] = [];
  let invDamage = 0;
  let invHorror = 0;
  for (const [target, [d, h]] of Object.entries(assigned)) {
    if (target === step.inv) {
      addCounter(game, me.id, "damage", d);
      addCounter(game, me.id, "horror", h);
      invDamage += d;
      invHorror += h;
    } else {
      const c = card(game, target);
      addCounter(game, c.id, "damage", d);
      addCounter(game, c.id, "horror", h);
      if (d > 0 || h > 0) touchedAssets.push(target);
      emit(game, EVENT.AssetDamage, `${def(game, target).name} takes ${d} damage, ${h} horror`, {
        card: target,
        inv: step.inv,
        data: { damage: d, horror: h, source: step.source },
      });
    }
  }
  if (invDamage || invHorror) {
    emit(game, EVENT.Damage, `${me.name} takes ${invDamage} damage and ${invHorror} horror`, {
      inv: step.inv,
      data: { damage: invDamage, horror: invHorror, source: step.source },
    });
  }
  push(game, {
    t: STEP.AfterDamage,
    inv: step.inv,
    damage: invDamage,
    horror: invHorror,
    assets: touchedAssets,
    enemy: step.enemy ?? null,
  });
};

export const afterDamageHandler: Handler<"AfterDamage"> = (game, step) => {
  const steps: Step[] = [];
  const enemy = step.enemy;
  for (const a of step.assets) {
    const c = cardIf(game, a);
    if (!c || c.zone !== "play") continue;
    if (enemy && c.damage > 0) steps.push(win("assetDamaged", { inv: step.inv, card: a, enemy }));
    if (c.horror > 0) steps.push(win("horrorOnAsset", { inv: c.controller, card: a }));
  }
  // asset defeat
  steps.push({ t: STEP.AssetDefeatCheck, inv: step.inv });
  if (step.horror > 0) steps.push(win("horrorPlaced", { inv: step.inv, amount: step.horror }));
  if (step.damage > 0)
    steps.push(win("damageTaken", { inv: step.inv, amount: step.damage, enemy }));
  if (step.horror > 0) steps.push(win("horrorTaken", { inv: step.inv, amount: step.horror }));
  if (step.damage > 0 || step.horror > 0)
    steps.push(win("damageOrHorrorTaken", { inv: step.inv, enemy }));
  // an attack by an enemy that kills whom it would defeat (Crazed Shoggoth)
  const killer = enemy && def(game, enemy).killsOnDefeat ? enemy : undefined;
  steps.push({ t: STEP.CheckDefeat, inv: step.inv, ...(killer ? { killer } : {}) });
  push(game, ...steps);
};

export function assetDefeatCheck(game: GameContext, i: InvId) {
  // every investigator's: a Bodyguard takes damage dealt to another
  for (const c of cardsIn(game, ZONE.Play)) {
    if (!c.controller || (c.controller !== i && !def(game, c.id).soaksForLocation)) continue;
    const d = def(game, c.id);
    if ((d.health && c.damage >= d.health) || (d.sanity && c.horror >= d.sanity)) {
      if (dying.get(game, c.id)) continue;
      emit(game, EVENT.AssetDefeated, `${d.name} is defeated`, { card: c.id });
      // "when defeated" reactions resolve while it is still in play, then it leaves
      dying.set(game, c.id, true);
      push(game, win("assetDefeated", { inv: c.controller, card: c.id }), {
        t: STEP.RemoveDefeatedAsset,
        card: c.id,
      });
    }
  }
}

export function removeDefeatedAsset(game: GameContext, id: InstId) {
  dying.clear(game, id);
  const c = cardIf(game, id);
  if (c?.zone === "play")
    moveCard(game, id, c.owner ? ZONE.Discard : ZONE.EncounterDiscard, { inv: c.owner });
}

export const checkDefeatHandler: Handler<"CheckDefeat"> = (game, step) => {
  const me = inv(game, step.inv);
  if (me.status !== "playing") return;
  const byDamage = me.damage >= maxHealth(game, step.inv);
  const byHorror = me.horror >= maxSanity(game, step.inv);
  if (!byDamage && !byHorror) return;
  const by = byDamage ? "damage" : "horror";
  const cause = byDamage && byHorror ? "both" : by;
  const killed = step.killer ? ({ killed: true } as const) : {};
  // the scenario may replace the defeat (Dim Carcosa); a card may, in a window before it (St. Hubert's Key)
  if (fireScenarioHook(game, "wouldBeDefeated", step.inv, cause) === true) return;
  if (!hasReplacement(game)) {
    push(game, { t: STEP.Defeated, inv: step.inv, by, ...killed });
    return;
  }
  const key = nextKey(game, "defeat:");
  push(game, win("wouldBeDefeated", { inv: step.inv, key, cause }), {
    t: STEP.Defeated,
    inv: step.inv,
    by,
    key,
    ...killed,
  });
};

/** a card in play with a "would be defeated" replacement: only then is the window opened */
export const hasReplacement = (game: GameContext) =>
  allCards(game).some(
    (c) =>
      (isInPlay(c) || c.zone === "hand") &&
      abilitiesOf(game, c.id).some((a) => a.trigger === "wouldBeDefeated"),
  );

export const defeatedHandler: Handler<"Defeated"> = (game, step) => {
  const me = inv(game, step.inv);
  if (me.status !== "playing") return;
  // a replacement took its place
  if (step.key && isCancelled(game, step.key)) return;
  setStatus(
    game,
    me.id,
    step.by === "resign" ? INV_STATUS.Resigned : INV_STATUS.Defeated,
    step.by === "resign" || step.by === "effect" ? undefined : step.by,
  );
  if (step.by === "damage" || step.by === "horror") {
    if (step.by === "damage") addCounter(game, me.id, "physicalTrauma", 1);
    else addCounter(game, me.id, "mentalTrauma", 1);
  }
  if (step.killed) killedFlag.set(game, me.id, true);
  emit(
    game,
    step.by === "resign" ? EVENT.Resign : EVENT.Defeated,
    step.by === "resign"
      ? `${me.name} resigns`
      : step.by === "effect"
        ? `${me.name} is defeated`
        : `${me.name} is defeated (${step.by === "damage" ? "physical" : "mental"} trauma)`,
    { inv: step.inv, data: { by: step.by } },
  );
  // clues drop at location, unless an act takes them (The Last King)
  const taken =
    me.clues > 0 &&
    Object.values(currentActs(game)).some(
      (act) =>
        !!act &&
        fireCardHook(game, card(game, act).code, "eliminated", { source: act }, me.id, me.clues) ===
          true,
    );
  if (me.location && me.clues && !taken) addCounter(game, me.location, "clues", me.clues);
  setCounter(game, me.id, "clues", 0);
  // engaged enemies stay at the location, unengaged
  for (const e of enemies(game)) if (e.engagedWith === step.inv) setEngaged(game, e.id, null);
  // their weaknesses' "when the game ends" abilities resolve now, before leaving the game (Grimoire, Elimination)
  fireGameEnd(
    game,
    allCards(game).filter(
      (c) =>
        c.owner === step.inv &&
        isOneOf(c.zone, ZONE.Play, ZONE.Threat, ZONE.Hand, ZONE.Attached) &&
        def(game, c.id).subtype,
    ),
  );
  // the story assets they resigned with ("if an investigator resigned with Peter Clover under his or her control")
  const story = controlled(game, me.id).filter((c) => !c.owner);
  if (step.by === "resign" && story.length)
    resignedWith.set(
      game,
      me.id,
      story.map((c) => c.code),
    );
  // queued first, so what the cards leaving play set off ("when Adam Lynch leaves play") resolves before it
  if (activeInvs(game).length === 0) push(game, { t: STEP.AllEliminated });
  else if (leadInvestigator(game) === step.inv) push(game, { t: STEP.ChooseLead });
  // cards leave play: owned cards out of the game, encounter cards to encounter discard
  for (const c of allCards(game)) {
    if (c.owner === step.inv && c.zone !== "removed" && c.zone !== "investigator")
      moveCard(game, c.id, ZONE.Removed);
    else if (!c.owner && c.controller === step.inv && (c.zone === "threat" || c.zone === "play"))
      moveCard(game, c.id, ZONE.EncounterDiscard);
  }
  placeInvestigator(game, me.id, null);
  if (activeInvestigator(game) === step.inv) setActive(game, null);
};

/** the remaining investigators choose a new lead when the lead is eliminated (Grimoire, Elimination) */
export function chooseLead(game: GameContext, step: Step) {
  const rest = activeInvs(game);
  if (!rest.length || rest.includes(leadInvestigator(game))) return;
  const pick = ask<InvId>(
    game,
    step,
    rest[0],
    CHOICE.Generic,
    "Choose the new lead investigator",
    rest.map((i) => ({ id: i, label: invName(game, i), card: inv(game, i).cardId, value: i })),
    { auto: true, key: "newLead" },
  );
  if (pick === undefined) return;
  setLead(game, pick);
  emit(game, EVENT.Lead, `${invName(game, pick)} is the new lead investigator`, { inv: pick });
}

// ---------- movement ----------
export function canMoveTo(game: GameContext, i: InvId, to: InstId) {
  const from = inv(game, i).location;
  return (
    !!from &&
    connections(game, from).includes(to) &&
    !hasFlag(game, to, "cannotMoveInto", modsFor(game, i)) &&
    !hasFlag(game, from, "cannotLeave") &&
    !cannotMove(game, i) &&
    spendableGroupClues(game, enterPayers(game, i, to)) >= enterCost(game, to) &&
    inv(game, i).clues >= ownEnterCost(game, to) &&
    !(
      def(game, to).cannotEnterUnrevealed &&
      !card(game, to).revealed &&
      !unrevealedIgnored(game, to)
    ) &&
    // "You must have at least 2 clues in order to move to The Edge of the Universe"
    inv(game, i).clues >= (def(game, to).moveInClues ?? 0)
  );
}

/** the investigator can't move at all: by an effect on them (Claws of Steam), or held by an engaged enemy (Grappling Horror) */
export function cannotMove(game: GameContext, i: InvId): boolean {
  const mods = allMods(game);
  return (
    hasFlag(game, i, "cannotMove", mods) ||
    engagedWith(game, i).some((e) => hasFlag(game, e.id, "cannotMoveWhileEngaged", mods))
  );
}

/** clues the group spends to enter a location (Underground Cistern, unrevealed) */
export function enterCost(game: GameContext, to: InstId): number {
  const n = def(game, to).enterCluesPerInvestigator;
  return n && !card(game, to).revealed && !unrevealedIgnored(game, to) ? n * playerCount(game) : 0;
}

/** who spends a location's group clue cost to enter it: everyone, or those at the mover's location (Abbey Church) */
export function enterPayers(game: GameContext, i: InvId, to: InstId): InvId[] | undefined {
  return def(game, to).enterCluesFromHere ? invsAt(game, inv(game, i).location) : undefined;
}

/** clues the entering investigator alone spends to enter a location (Patient Confinement, unrevealed) */
export function ownEnterCost(game: GameContext, to: InstId): number {
  const n = def(game, to).enterClues;
  return n && !card(game, to).revealed && !unrevealedIgnored(game, to) ? n : 0;
}

/**
 * a modifier in play has the text of this location's unrevealed side ignored: on this location itself (The Pallid
 * Mask's Stone Archways, for its neighbours), or, from a card that is no location, on the locations its filter matches
 * (The Unspeakable Oath's acts)
 */
const unrevealedIgnored = (game: GameContext, loc: InstId) =>
  allMods(game).some(
    (m) =>
      m.mod.flag === "ignoreUnrevealedText" &&
      (m.target === loc ||
        (cardIf(game, m.target)?.zone !== ZONE.Location &&
          (!m.mod.filter || matchesFilter(game, card(game, loc).code, m.mod.filter)))),
  );

export const moveHandler: Handler<"Move"> = (game, step) => {
  // moving on your own takes you out of any vehicle you were in
  setVehicle(game, step.inv, null);
  const key = step.key ?? nextKey(game, "move");
  const from = inv(game, step.inv).location;
  push(
    game,
    ...(from
      ? [
          win("wouldMoveOut", { inv: step.inv, location: from, to: step.to, key }),
          // what it costs to move into a location (Arcane Barrier): cancelling the key cancels the move
          win("wouldMoveIn", { inv: step.inv, location: step.to, key }),
          win("leaveLocation", { inv: step.inv, location: from, key }),
        ]
      : []),
    { t: STEP.Arrive, inv: step.inv, to: step.to, key },
  );
};

export const enterVehicleHandler: Handler<"EnterVehicle"> = (game, step) => {
  setVehicle(game, step.inv, step.vehicle);
  vehicleUsed.set(game, `${step.inv}:enter`, currentRound(game));
  emit(game, EVENT.Vehicle, `${invName(game, step.inv)} enters ${def(game, step.vehicle).name}`, {
    inv: step.inv,
    card: step.vehicle,
  });
};

export const leaveVehicleHandler: Handler<"LeaveVehicle"> = (game, step) => {
  const was = inv(game, step.inv).vehicle;
  if (!was) return;
  setVehicle(game, step.inv, null);
  vehicleUsed.set(game, `${step.inv}:leave`, currentRound(game));
  emit(game, EVENT.Vehicle, `${invName(game, step.inv)} leaves ${def(game, was).name}`, {
    inv: step.inv,
    card: was,
  });
};

/** the vehicle goes to `to`, and each investigator in it arrives there (enter windows, no move action, no leaving) */
export const moveVehicleHandler: Handler<"MoveVehicle"> = (game, step) => {
  setCardLocation(game, step.vehicle, step.to);
  push(
    game,
    ...activeInvs(game)
      .filter((i) => inv(game, i).vehicle === step.vehicle)
      .map((i): Step => ({ t: STEP.Arrive, inv: i, to: step.to })),
  );
};

export const arriveHandler: Handler<"Arrive"> = (game, step) => {
  if (step.key && isCancelled(game, step.key)) return;
  const me = inv(game, step.inv);
  if (me.status !== "playing") return;
  const from = me.location;
  placeInvestigator(game, me.id, step.to);
  // engaged enemies move with the investigator (massive ones engage everyone at their location)
  for (const e of enemies(game))
    if (e.engagedWith === step.inv && !isMassive(game, e.id)) setCardLocation(game, e.id, step.to);
  emit(game, EVENT.Move, `${me.name} moves to ${def(game, step.to).name}`, {
    inv: step.inv,
    card: step.to,
    data: { from },
  });
  const steps: Step[] = [];
  const loc = card(game, step.to);
  if (!loc.revealed) steps.push({ t: STEP.RevealLocation, location: step.to, by: step.inv });
  // "after an investigator leaves …" (Endless Bridge), once they are gone
  if (from && from !== step.to) steps.push(win("leftLocation", { inv: step.inv, location: from }));
  steps.push(win("enterLocation", { inv: step.inv, location: step.to, from }));
  steps.push({ t: STEP.CheckEngagement, inv: step.inv });
  steps.push({ t: STEP.CheckObjectives });
  push(game, ...steps);
};

export function revealLocation(game: GameContext, loc: InstId) {
  const c = card(game, loc);
  if (c.revealed) return;
  reveal(game, c.id);
  const d = def(game, loc);
  if (canPlaceClues(game, c.id))
    addCounter(
      game,
      c.id,
      "clues",
      (d.clues ?? 0) * (d.cluesPerInvestigator ? playerCount(game) : 1),
    );
  emit(game, EVENT.Reveal, `${d.name} is revealed (${c.clues} clues)`, {
    card: loc,
    data: { n: c.clues },
  });
}

/** reveal a location, then its "after you reveal this location" abilities, for the investigator who revealed it */
function revealLocationHandler(game: GameContext, step: StepOf<"RevealLocation">) {
  if (card(game, step.location).revealed) return;
  revealLocation(game, step.location);
  if (abilitiesOf(game, step.location).some((a) => a.trigger === "revealed"))
    push(game, win("revealed", { location: step.location, ...(step.by ? { inv: step.by } : {}) }));
}

/** ready unengaged non-aloof enemies at an investigator's location engage by prey among everyone there (the mover on a tie) */
export function checkEngagement(game: GameContext, i: InvId) {
  const me = inv(game, i);
  if (me.status !== "playing") return;
  for (const e of enemies(game)) {
    if (e.location !== me.location || e.engagedWith || e.exhausted) continue;
    if (isAloof(game, e.id) || isMassive(game, e.id)) continue;
    const prey = preyCandidates(game, e.id, invsAt(game, me.location));
    const to = prey.includes(i) ? i : prey[0];
    if (!to) continue; // Prey - bearer only with no bearer here
    setEngaged(game, e.id, to);
    emit(game, EVENT.Engage, `${def(game, e.id).name} engages ${invName(game, to)}`, {
      inv: to,
      card: e.id,
    });
    push(game, win("enemyEngages", { inv: to, enemy: e.id }));
  }
}

// ---------- clues ----------
export const discoverCluesHandler: Handler<"DiscoverClues"> = (game, step) => {
  const loc = card(game, step.location);
  const n = Math.min(step.n, loc.clues);
  if (n <= 0 || hasFlag(game, step.inv, "cannotDiscoverClues")) return;
  // "you cannot discover clues here except by investigating" (Schoolhouse)
  const t = currentTest(game);
  if (
    hasFlag(game, step.location, "cluesOnlyByInvestigating") &&
    !(t?.kind === "investigate" && t.target === step.location)
  )
    return;
  const key = nextKey(game, "clues");
  push(
    game,
    win("wouldDiscoverClues", { inv: step.inv, location: step.location, key, amount: n }),
    {
      t: STEP.GainClues,
      inv: step.inv,
      location: step.location,
      n,
      key,
    },
  );
};

export const gainCluesHandler: Handler<"GainClues"> = (game, step) => {
  if (isCancelled(game, step.key)) return;
  const loc = card(game, step.location);
  const n = Math.min(step.n, loc.clues);
  addCounter(game, loc.id, "clues", -n);
  addCounter(game, step.inv, "clues", n);
  if (n > 0)
    push(
      game,
      win("cluesDiscovered", { inv: step.inv, location: step.location, amount: n }),
      // discovering is one way of gaining (Clover Club Pit Boss)
      win("cluesGained", { inv: step.inv, amount: n }),
    );
  emit(
    game,
    EVENT.Clues,
    `${invName(game, step.inv)} discovers ${n} clue${n === 1 ? "" : "s"} at ${def(game, step.location).name}`,
    { inv: step.inv, card: step.location, data: { n } },
  );
};

// ---------- setup helpers ----------
export const mulliganHandler: Handler<"Mulligan"> = (game, step) => {
  const me = inv(game, step.inv);
  const chosen = step.chosen ?? [];
  const opts = me.hand.filter((h) => !chosen.includes(h));
  const pick = ask<string | { unpick: InstId }>(
    game,
    step,
    step.inv,
    CHOICE.Mulligan,
    `${me.name}: mulligan — choose cards to redraw (${chosen.length} chosen)`,
    [
      {
        id: "done",
        label: chosen.length ? `Redraw ${chosen.length} card(s)` : "Keep hand",
        value: "done",
      },
      ...(chosen.length < 5
        ? opts.map((h) => ({ id: h, label: def(game, h).name, card: h, value: h }))
        : []),
      ...chosen.map((h) => ({
        id: `un:${h}`,
        label: `Take back ${def(game, h).name}`,
        card: h,
        value: { unpick: h },
      })),
    ],
    { key: "mulligan", vars: { n: chosen.length } },
  );
  if (pick === undefined) return;
  if (typeof pick === "object") {
    push(game, { ...step, choice: undefined, chosen: chosen.filter((h) => h !== pick.unpick) });
    return;
  }
  if (pick !== "done") {
    push(game, { ...step, choice: undefined, chosen: [...chosen, pick] });
    return;
  }
  for (const h of chosen) moveCard(game, h, ZONE.Limbo);
  drawOpeningCards(game, step.inv, chosen.length);
  for (const h of chosen) moveCard(game, h, ZONE.Deck);
  shuffleDeck(game, me.id);
  // weaknesses set aside during opening draw go back in
  const setAside = asideFlag.get(game, step.inv) ?? [];
  for (const h of setAside) moveCard(game, h, ZONE.Deck);
  if (setAside.length) shuffleDeck(game, me.id);
  asideFlag.clear(game, step.inv);
  if (chosen.length)
    emit(game, EVENT.Mulligan, `${me.name} redraws ${chosen.length} card(s)`, {
      inv: step.inv,
      data: { n: chosen.length },
    });
};

/** draw n opening cards, setting weaknesses aside and replacing them */
export function drawOpeningCards(game: GameContext, i: InvId, n: number) {
  const me = inv(game, i);
  const aside = (asideFlag.get(game, i) ?? []).slice();
  let drawn = 0;
  while (drawn < n && me.deck.length) {
    const id = me.deck[0];
    if (def(game, id).subtype) {
      moveCard(game, id, ZONE.SetAside);
      aside.push(id);
      continue;
    }
    moveCard(game, id, ZONE.Hand);
    drawn++;
  }
  asideFlag.set(game, i, aside);
}

/** most cards an investigator keeps at the end of upkeep */
export const HAND_LIMIT = 8;

/** an investigator's maximum hand size: 8, raised by modifiers (Laboratory Assistant) */
export const handLimit = (game: GameContext, i: InvId) => HAND_LIMIT + modSum(game, i, "handSize");
/** the cards an investigator's hand counts as: a Hidden card counts for more where a location says so (Backstage) */
export const handCount = (game: GameContext, i: InvId) =>
  inv(game, i).hand.length +
  inv(game, i).hand.filter((h) => isHidden(game, h)).length * modSum(game, i, "hiddenHandWeight");

export const handSizeHandler: Handler<"HandSize"> = (game, step) => {
  const me = inv(game, step.inv);
  if (me.status !== "playing") return;
  const limit = handLimit(game, step.inv);
  const excess = handCount(game, step.inv) - limit;
  // a Hidden card is never discarded to the hand size
  const discardable = me.hand.filter((h) => !isHidden(game, h));
  if (excess <= 0 || !discardable.length) return;
  if (!step.stepped && step.choice === undefined) logStep(game, "handSize", step.inv);
  const pick = ask<InstId>(
    game,
    step,
    step.inv,
    CHOICE.Generic,
    `${me.name}: discard down to ${limit} cards (${excess} more)`,
    discardable.map((h) => ({ id: h, label: def(game, h).name, card: h, value: h })),
    { key: "discardDown", vars: { n: excess } },
  );
  if (pick === undefined) return;
  moveCard(game, pick, ZONE.Discard);
  emit(game, EVENT.Discard, `${me.name} discards ${def(game, pick).name}`, {
    inv: step.inv,
    card: pick,
  });
  push(game, { ...step, choice: undefined, stepped: true });
};

export { cardsIn, engagedWith };

export const handlers = {
  AssetDefeatCheck: (game: GameContext, step: StepOf<"AssetDefeatCheck">) =>
    assetDefeatCheck(game, step.inv),
  RemoveDefeatedAsset: (game: GameContext, step: StepOf<"RemoveDefeatedAsset">) =>
    removeDefeatedAsset(game, step.card),
  RevealLocation: revealLocationHandler,
  CheckEngagement: (game: GameContext, step: StepOf<"CheckEngagement">) =>
    checkEngagement(game, step.inv),
  ChooseLead: (game: GameContext, step: StepOf<"ChooseLead">) => chooseLead(game, step),
  Draw: drawHandler,
  AssignDamage: assignDamageHandler,
  AfterDamage: afterDamageHandler,
  CheckDefeat: checkDefeatHandler,
  Defeated: defeatedHandler,
  Move: moveHandler,
  Arrive: arriveHandler,
  EnterVehicle: enterVehicleHandler,
  LeaveVehicle: leaveVehicleHandler,
  MoveVehicle: moveVehicleHandler,
  DiscoverClues: discoverCluesHandler,
  GainClues: gainCluesHandler,
  Mulligan: mulliganHandler,
  HandSize: handSizeHandler,
};
