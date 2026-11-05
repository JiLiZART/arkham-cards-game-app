import { attackBonus, attacked, damageBonus, defeated, noAttack } from "../world/flags";
import {
  activeInvs,
  addCounter,
  allCards,
  ask,
  card,
  cardIf,
  currentPhase,
  currentRound,
  def,
  emit,
  exhaust,
  type GameContext,
  inv,
  invIf,
  invName,
  isCancelled,
  leadInvestigator,
  logStep,
  nextKey,
  push,
  randomInt,
  ready,
  setCounter,
  setCardLocation,
  setEngaged,
  turnOrder,
} from "../context";
import {
  attackableBy,
  cellOf,
  connections,
  distances,
  enemies,
  abilitiesOf,
  swarmOf,
  enemiesAt,
  keywordArg,
  enemyStat,
  allMods,
  engagedWith,
  hasFlag,
  hasKeyword,
  isAloof,
  invsAt,
  isElite,
  isMassive,
  locationAt,
  locationByName,
  locations,
  nearestTo,
  spawnTargets,
  remainingHealth,
  remainingSanity,
  skillValue,
  stepsToward,
} from "../queries";
import { moveCard, putBeneath } from "../movement";
import type { InstId, InvId, Step, StepOf } from "../world/types";
import { win } from "./cards";
import { EVENT } from "../events/event";
import { ZONE, CHOICE, PHASE } from "../world/constants";
import { STEP } from "../steps/step";
import { fireScenarioHook } from "./scripts";

type Handler<T extends Step["t"]> = (game: GameContext, step: Extract<Step, { t: T }>) => void;

/** investigators among candidates that match the enemy's prey instruction */
export function preyCandidates(game: GameContext, enemy: InstId, candidates: InvId[]): InvId[] {
  const prey = def(game, enemy).prey;
  if (!prey) return candidates;
  // "only" prey never falls back to others: with nobody matching it engages and hunts no one
  if (prey === "bearer") return candidates.filter((i) => i === card(game, enemy).owner);
  if ("only" in prey)
    return candidates.filter((i) => card(game, inv(game, i).cardId).code === prey.only);
  if ("nearestTo" in prey) return nearestTo(game, prey.nearestTo, candidates);
  if (candidates.length <= 1) return candidates;
  const [dir, stat] = "highest" in prey ? [1, prey.highest] : [-1, prey.lowest];
  const val = (i: InvId) => {
    switch (stat) {
      case "clues":
        return inv(game, i).clues;
      case "remainingHealth":
        return remainingHealth(game, i);
      case "remainingSanity":
        return remainingSanity(game, i);
      case "cardsInHand":
        return inv(game, i).hand.length;
      case "resources":
        return inv(game, i).resources;
      default:
        return skillValue(game, i, stat);
    }
  };
  const best = Math.max(...candidates.map((i) => dir * val(i)));
  return candidates.filter((i) => dir * val(i) === best);
}

/** Prey - bearer only / Prey - X only: the enemy ignores every other investigator */
export function onlyPrey(game: GameContext, enemy: InstId) {
  const prey = def(game, enemy).prey;
  return prey === "bearer" || (!!prey && "only" in prey);
}

// ---------- spawning ----------
export const spawnHandler: Handler<"Spawn"> = (game, step) => {
  const d = def(game, step.enemy);
  const c = card(game, step.enemy);
  let at = step.at ?? null;
  let engage: InvId | null = null;
  const drawerLoc = step.inv ? inv(game, step.inv).location : null;
  if (!at) at = fireScenarioHook(game, "spawnRedirect", step.enemy) ?? null;
  if (!at && d.spawn && typeof d.spawn === "object") {
    // a spawn expression: the drawer chooses among the locations it names; none in play, the enemy is discarded
    const cands = spawnTargets(game, d.spawn, drawerLoc);
    if (!cands.length) {
      emit(game, EVENT.SpawnFail, `${d.name} has no spawn location in play and is discarded`, {
        card: step.enemy,
      });
      moveCard(game, step.enemy, c.owner ? ZONE.Discard : ZONE.EncounterDiscard);
      return;
    }
    const pick = ask<InstId>(
      game,
      step,
      step.inv ?? leadInvestigator(game),
      CHOICE.Target,
      `Choose where ${d.name} spawns`,
      cands.map((l) => ({ id: l, label: def(game, l).name, card: l, value: l })),
      { auto: true, key: "spawnAt", vars: { card: step.enemy } },
    );
    if (pick === undefined) return;
    at = pick;
  } else if (!at && typeof d.spawn === "string" && d.spawn) {
    if (d.spawn === "emptyLocation" || d.spawn === "farthestEmptyLocation") {
      let empty = locations(game).filter(
        (l) => invsAt(game, l.id).length === 0 && !enemies(game).some((e) => e.location === l.id),
      );
      // the farthest from the investigator who drew it (The Nameless Lurker)
      if (d.spawn === "farthestEmptyLocation" && drawerLoc && empty.length) {
        const dist = distances(game, drawerLoc);
        const far = Math.max(...empty.map((l) => dist.get(l.id) ?? -1));
        empty = empty.filter((l) => (dist.get(l.id) ?? -1) === far);
      }
      if (empty.length) {
        const pick = ask<InstId>(
          game,
          step,
          leadInvestigator(game),
          CHOICE.Target,
          `Choose an empty location to spawn ${d.name}`,
          empty.map((l) => ({ id: l.id, label: def(game, l.id).name, card: l.id, value: l.id })),
          { auto: true, key: "spawnAt", vars: { card: step.enemy } },
        );
        if (pick === undefined) return;
        at = pick;
      }
    } else if (d.spawn === "toYourRight") {
      // the location on the map's cell to the right of the drawer's, else the drawer's (Emergent Monstrosity)
      const here = drawerLoc ? cellOf(game, drawerLoc) : null;
      at = (here && locationAt(game, [here[0] + 1, here[1]])) || drawerLoc;
    } else if (d.spawn === "Engaged with Prey") {
      const cands = preyCandidates(game, step.enemy, activeInvs(game));
      if (!cands.length) {
        emit(game, EVENT.SpawnFail, `${d.name} has no prey in play and is discarded`, {
          card: step.enemy,
        });
        moveCard(game, step.enemy, c.owner ? ZONE.Discard : ZONE.EncounterDiscard);
        return;
      }
      const pick = ask<InvId>(
        game,
        step,
        leadInvestigator(game),
        CHOICE.Target,
        `${d.name} spawns engaged with:`,
        cands.map((i) => ({ id: i, label: invName(game, i), card: inv(game, i).cardId, value: i })),
        { auto: true, key: "spawnEngaged", vars: { card: step.enemy } },
      );
      if (pick === undefined) return;
      engage = pick;
      at = inv(game, pick).location;
    } else {
      const loc = locationByName(game, d.spawn);
      if (!loc) {
        emit(game, EVENT.SpawnFail, `${d.name} has no spawn location in play and is discarded`, {
          card: step.enemy,
        });
        moveCard(game, step.enemy, c.owner ? ZONE.Discard : ZONE.EncounterDiscard);
        return;
      }
      at = loc.id;
    }
  }
  if (!at) {
    at = drawerLoc;
    engage = step.inv && preyCandidates(game, step.enemy, [step.inv]).length ? step.inv : null;
  }
  if (!at) {
    moveCard(game, step.enemy, c.owner ? ZONE.Discard : ZONE.EncounterDiscard);
    return;
  }
  // a location non-Elite enemies cannot spawn at sends them to a connecting location, if able (Barricade (3))
  if (!isElite(game, step.enemy) && hasFlag(game, at, "cannotSpawnAt")) {
    const away = connections(game, at);
    if (away.length === 1) at = away[0];
    else if (away.length > 1) {
      if (!step.redirect) {
        push(game, { ...step, at, redirect: true, choice: undefined });
        return;
      }
      const pick = ask<InstId>(
        game,
        step,
        leadInvestigator(game),
        CHOICE.Target,
        `Choose where ${d.name} spawns instead`,
        away.map((l) => ({ id: l, label: def(game, l).name, card: l, value: l })),
        { key: "spawnAt", vars: { card: step.enemy } },
      );
      if (pick === undefined) return;
      at = pick;
    }
  }
  // "when an enemy would spawn at your location" (Think on Your Feet): then it spawns there, engaging whom it would if
  // they are still there
  if (!step.asked) {
    push(game, win("enemyWouldSpawn", { inv: step.inv, enemy: step.enemy, location: at }), {
      ...step,
      at,
      engage,
      asked: true,
      choice: undefined,
    });
    return;
  }
  if (step.engage && inv(game, step.engage).location === at) engage = step.engage;
  moveCard(game, step.enemy, ZONE.Enemy, { location: at });
  // a unique encounter card entering play discards the player card with its title (Grimoire, Unique)
  if (d.unique)
    for (const twin of allCards(game))
      if (twin.owner && twin.zone === "play" && def(game, twin.id).name === d.name)
        moveCard(game, twin.id, ZONE.Discard, { inv: twin.owner });
  emit(game, EVENT.Spawn, `${d.name} spawns at ${def(game, at).name}`, {
    card: step.enemy,
    data: { at },
  });
  // an enemy that enters play exhausted engages no one as it spawns (Emergent Monstrosity)
  if (d.entersExhausted) exhaust(game, step.enemy);
  const aloof = isAloof(game, step.enemy) || !!d.entersExhausted;
  if (!engage && !aloof && !isMassive(game, step.enemy)) {
    // ponytail: first tied prey in player order; lead choice if it ever matters
    engage = preyCandidates(game, step.enemy, invsAt(game, at))[0] ?? null;
  }
  if (engage && !aloof && !isMassive(game, step.enemy)) {
    setEngaged(game, c.id, engage);
    emit(game, EVENT.Engage, `${d.name} engages ${invName(game, engage)}`, {
      inv: engage,
      card: step.enemy,
    });
  }
  // Swarming X: the top X cards of the drawer's deck (the lead's when no one drew it) beneath it
  const swarming = keywordArg(game, step.enemy, "swarming");
  push(
    game,
    ...(swarming !== undefined
      ? [
          {
            t: STEP.Eff,
            effect: { op: "addSwarm", amount: swarming },
            ctx: { source: step.enemy, enemy: step.enemy, you: step.inv ?? leadInvestigator(game) },
          } as Step,
        ]
      : []),
    win("enemySpawns", { inv: step.inv, enemy: step.enemy, location: at }),
    win("enemyEntersLocation", { enemy: step.enemy, location: at }),
    win("enterPlay", { card: step.enemy, enemy: step.enemy }),
    ...(engage ? [win("enemyEngages", { inv: engage, enemy: step.enemy })] : []),
    { t: STEP.CheckObjectives },
  );
};

// ---------- attacks ----------
export const enemyAttackHandler: Handler<"EnemyAttack"> = (game, step) => {
  const e = cardIf(game, step.enemy);
  push(
    game,
    win("enemyAttacks", { inv: step.inv, enemy: step.enemy, key: step.key }),
    { t: STEP.ResolveAttack, enemy: step.enemy, inv: step.inv, key: step.key },
    // a ready elusive enemy slips away after it attacks
    ...(e && !e.exhausted && hasKeyword(game, step.enemy, "elusive")
      ? [{ t: STEP.Elusive, enemy: step.enemy } as Step]
      : []),
  );
};

/** Elusive: the enemy disengages, moves to a connecting location (one with no investigators if able) and exhausts */
export function elusive(game: GameContext, id: InstId, step: Step) {
  const e = cardIf(game, id);
  if (!e || e.zone !== "enemy" || e.exhausted || !e.location) return;
  const near = connections(game, e.location).filter((l) => canEnemyEnter(game, id, l));
  const empty = near.filter((l) => !invsAt(game, l).length);
  const opts = empty.length ? empty : near;
  if (opts.length) {
    const to = ask<InstId>(
      game,
      step,
      leadInvestigator(game),
      CHOICE.Target,
      `Where does ${def(game, id).name} move?`,
      opts.map((l) => ({ id: l, label: def(game, l).name, card: l, value: l })),
      { auto: true, key: "enemyMoveWhere", vars: { card: id } },
    );
    if (to === undefined) return;
    setCardLocation(game, e.id, to);
  }
  setEngaged(game, e.id, null);
  exhaust(game, e.id);
  emit(game, EVENT.Elusive, `${def(game, id).name} slips away`, {
    card: id,
    data: { to: e.location },
  });
}

export const resolveAttackHandler: Handler<"ResolveAttack"> = (game, step) => {
  const e = cardIf(game, step.enemy);
  if (!e || e.zone !== "enemy" || inv(game, step.inv).status !== "playing") return;
  if (isCancelled(game, step.key)) {
    emit(game, EVENT.AttackCancelled, `${def(game, step.enemy).name}'s attack is cancelled`, {
      card: step.enemy,
    });
    push(game, win("enemyAttacked", { inv: step.inv, enemy: step.enemy }));
    return;
  }
  if (!isElite(game, step.enemy) && hasFlag(game, step.inv, "nonEliteCannotAttack")) return;
  // "she cannot attack you for the remainder of the round" (Elokoss)
  if (noAttack.get(game, [step.enemy, step.inv]) === currentRound(game)) return;
  const bonus = attackBonus.take(game, step.key) ?? 0;
  // "if this enemy attacked you this round" (Daniela's Wrench)
  attacked.set(game, [step.enemy, step.inv], currentRound(game));
  const damage = enemyStat(game, step.enemy, "damage") + bonus;
  const horror = enemyStat(game, step.enemy, "horror") + bonus;
  emit(
    game,
    EVENT.Attack,
    `${def(game, step.enemy).name} attacks ${invName(game, step.inv)} (${damage} damage, ${horror} horror)`,
    { inv: step.inv, card: step.enemy, data: { damage, horror } },
  );
  push(
    game,
    // what the attack deals can be prevented before it is assigned (Flesh Ward); the window names what was dealt
    win("attackDealsDamage", { inv: step.inv, enemy: step.enemy, key: step.key, damage, horror }),
    {
      t: STEP.AssignDamage,
      inv: step.inv,
      damage,
      horror,
      direct: false,
      source: step.enemy,
      enemy: step.enemy,
      key: step.key,
    },
    win("enemyAttacked", { inv: step.inv, enemy: step.enemy }),
  );
};

/** a random location in play, but those excluded (Undimensioned and Unseen: one drawn from the removed other versions) */
export function randomLocation(game: GameContext, exclude: readonly InstId[] = []): InstId | null {
  const pool = locations(game)
    .map((l) => l.id)
    .filter((id) => !exclude.includes(id));
  return pool.length ? pool[randomInt(game, pool.length)] : null;
}

export function attackKey(game: GameContext) {
  return nextKey(game, "atk");
}

/** attacks of opportunity from each ready engaged enemy */
export function attacksOfOpportunity(game: GameContext, i: InvId): Step[] {
  return engagedWith(game, i)
    .filter(
      (e) => !e.exhausted && !isAloof(game, e.id) && !hasFlag(game, e.id, "noAttacksOfOpportunity"),
    )
    .map((e) => ({ t: STEP.EnemyAttack, enemy: e.id, inv: i, aoo: true, key: attackKey(game) }));
}

// ---------- damage & defeat ----------
export const damageEnemyHandler: Handler<"DamageEnemy"> = (game, step) => {
  const e = cardIf(game, step.enemy);
  if (!e || e.zone !== "enemy" || step.amount <= 0) return;
  if (
    hasFlag(game, step.enemy, "cannotBeDamaged") ||
    !attackableBy(game, step.enemy, step.source)
  ) {
    emit(game, EVENT.NoDamage, `${def(game, step.enemy).name} cannot be damaged`, {
      card: step.enemy,
    });
    return;
  }
  // what an investigator deals can grow, or be capped, before it is placed (Nathaniel Cho, Tommy Malloy)
  if (step.by && !step.windowed) {
    const key = step.key ?? nextKey(game, "dmg");
    push(
      game,
      win("dealDamage", {
        inv: step.by,
        enemy: step.enemy,
        card: step.source ?? null,
        key,
        amount: step.amount,
      }),
      { ...step, key, windowed: true },
    );
    return;
  }
  // no key gives the key "undefined", as before
  let amount = step.amount + (damageBonus.take(game, String(step.key)) ?? 0);
  if (hasFlag(game, step.enemy, "damageCapOne")) amount = Math.min(amount, 1);
  const health = enemyStat(game, step.enemy, "health");
  // a swarm card takes the damage first, as the enemy with its health; defeated, it returns to the bottom of its owner's
  // deck, and what is left carries over to the next one, then to the host
  for (const sc of swarmOf(game, step.enemy)) {
    if (amount <= 0) break;
    const take = Math.min(amount, health - card(game, sc).damage);
    amount -= take;
    if (card(game, sc).damage + take < health) {
      addCounter(game, sc, "damage", take);
      break;
    }
    setCounter(game, sc, "damage", 0);
    moveCard(game, sc, ZONE.Deck, { inv: card(game, sc).owner });
    emit(game, EVENT.SwarmDefeated, `A swarm card of ${def(game, step.enemy).name} is defeated`, {
      card: step.enemy,
    });
  }
  if (amount <= 0) return;
  const excess = e.damage + amount - health;
  addCounter(game, e.id, "damage", amount);
  emit(
    game,
    EVENT.EnemyDamage,
    `${def(game, step.enemy).name} takes ${amount} damage (${e.damage}/${health})`,
    { card: step.enemy, data: { amount } },
  );
  // after an investigator's damage is placed (In Harm's Way)
  if (step.by) push(game, win("enemyDamaged", { inv: step.by, enemy: step.enemy, amount }));
  if (e.damage >= health) {
    push(
      game,
      ...(excess > 0 && step.by
        ? [win("excessDamage", { inv: step.by, enemy: step.enemy, amount: excess })]
        : []),
      step.via
        ? { t: STEP.DefeatEnemy, enemy: step.enemy, by: step.by, via: step.via }
        : { t: STEP.DefeatEnemy, enemy: step.enemy, by: step.by },
    );
  }
};

export const defeatEnemyHandler: Handler<"DefeatEnemy"> = (game, step) => {
  const e = cardIf(game, step.enemy);
  if (!e || e.zone !== "enemy") return;
  // a swarming enemy isn't defeated while its swarm cards remain
  if (swarmOf(game, step.enemy).length) return;
  // a replacement may take the defeat's place: the scenario's (a hook), or the enemy's own in a window (The Thing That Follows)
  if (!step.checked) {
    if (fireScenarioHook(game, "wouldBeDefeated", step.enemy, "damage") === true) return;
    if (abilitiesOf(game, step.enemy).some((a) => a.trigger === "wouldBeDefeated")) {
      const key = nextKey(game, "defeat:");
      push(game, win("wouldBeDefeated", { enemy: step.enemy, key, cause: "damage" }), {
        ...step,
        checked: true,
        key,
      });
      return;
    }
  }
  if (step.key && isCancelled(game, step.key)) return;
  if (!step.fired) {
    // "when defeated" forced abilities resolve while the enemy is still in play
    push(
      game,
      win("enemyDefeatedSelf", {
        enemy: step.enemy,
        inv: null,
        // who defeated it, for "after you defeat …" (Servant of Many Mouths)
        defeatedBy: step.by ?? null,
        ...(step.via ? { via: step.via } : {}),
      }),
      {
        ...step,
        fired: true,
      },
    );
    return;
  }
  const d = def(game, step.enemy);
  if (step.by && invIf(game, step.by))
    addCounter(game, step.by, "defeatedHealth", d.enemy?.health ?? 0);
  emit(
    game,
    EVENT.EnemyDefeated,
    `${d.name} is defeated${step.by ? ` by ${invName(game, step.by)}` : ""}`,
    {
      card: step.enemy,
      inv: step.by,
      data: { by: step.by ?? null, ...(step.via ? { via: step.via } : {}) },
    },
  );
  if (d.victory !== undefined) moveCard(game, step.enemy, ZONE.Victory);
  else moveCard(game, step.enemy, e.owner ? ZONE.Discard : ZONE.EncounterDiscard);
  defeated.set(game, e.code, true);
  push(
    game,
    win("enemyDefeated", {
      inv: step.by,
      defeated: step.enemy,
      ...(step.via ? { via: step.via } : {}),
    }),
    {
      t: STEP.CheckObjectives,
    },
  );
  // Doomed: 1 doom on the current agenda, which can make it advance
  if (d.keywords.includes("doomed"))
    push(game, { t: STEP.PlaceDoom, card: "agenda", n: 1 }, { t: STEP.CheckDoom });
};

// ---------- enemy phase ----------
/** in the enemy phase, the locations a Lure draws each moving enemy toward instead (none: they move as usual) */
function lures(game: GameContext): InstId[] {
  if (currentPhase(game) !== PHASE.Enemy) return [];
  const mods = allMods(game);
  return locations(game)
    .filter((l) => hasFlag(game, l.id, "luresEnemies", mods))
    .map((l) => l.id);
}

/** where a Patrol enemy patrols toward: the scenario's say, else its keyword's expression from where it is */
function patrolGoals(game: GameContext, enemy: InstId): InstId[] | null {
  const hooked = fireScenarioHook(game, "patrolTarget", enemy);
  if (hooked) return hooked;
  const expr = keywordArg(game, enemy, "patrol");
  if (expr === undefined) return null;
  if (typeof expr === "string")
    return locations(game)
      .filter((l) => def(game, l.id).name === expr)
      .map((l) => l.id);
  return spawnTargets(game, expr, card(game, enemy).location);
}

/**
 * Patrol (Grimoire): at the start of the enemy phase each ready unengaged Patrol enemy moves one location along the
 * shortest path toward its target; the lead chooses between tied targets and paths; a step it cannot enter, or being
 * there already, keeps it where it is.
 */
export const patrolMovesHandler: Handler<"PatrolMoves"> = (game, step) => {
  const done = step.done ?? [];
  const e = enemies(game).find(
    (x) =>
      !done.includes(x.id) &&
      !x.exhausted &&
      !x.engagedWith &&
      !!x.location &&
      patrolGoals(game, x.id) !== null,
  );
  if (!e) return;
  const next: Step = { t: STEP.PatrolMoves, done: [...done, e.id] };
  const lured = lures(game);
  const goals = lured.length ? lured : (patrolGoals(game, e.id) ?? []);
  const dist = distances(game, e.location!);
  const nearest = Math.min(...goals.map((g) => dist.get(g) ?? Infinity));
  if (!goals.length || nearest === 0 || nearest === Infinity) {
    push(game, next);
    return;
  }
  let goal = step.toward;
  if (!goal) {
    const tied = goals.filter((g) => dist.get(g) === nearest);
    if (tied.length > 1) {
      const pick = ask<InstId>(
        game,
        step,
        leadInvestigator(game),
        CHOICE.Target,
        `Where does ${def(game, e.id).name} patrol toward?`,
        tied.map((l) => ({ id: l, label: def(game, l).name, card: l, value: l })),
        { key: "patrolToward", vars: { card: e.id } },
      );
      if (pick !== undefined) push(game, { ...step, choice: undefined, toward: pick });
      return;
    }
    goal = tied[0];
  }
  const options = stepsToward(game, e.location!, [goal]).filter((l) =>
    canEnemyEnter(game, e.id, l),
  );
  if (!options.length) {
    push(game, next);
    return;
  }
  const to = ask<InstId>(
    game,
    step,
    leadInvestigator(game),
    CHOICE.Target,
    `Where does ${def(game, e.id).name} move?`,
    options.map((l) => ({ id: l, label: def(game, l).name, card: l, value: l })),
    { auto: true, key: "enemyMoveWhere", vars: { card: e.id } },
  );
  if (to === undefined) return;
  const from = e.location;
  setCardLocation(game, e.id, to);
  emit(game, EVENT.EnemyMove, `${def(game, e.id).name} patrols to ${def(game, to).name}`, {
    card: e.id,
    data: { from, to },
  });
  const p = preyCandidates(game, e.id, invsAt(game, to))[0];
  if (p && !isAloof(game, e.id) && !isMassive(game, e.id)) {
    setEngaged(game, e.id, p);
    emit(game, EVENT.Engage, `${def(game, e.id).name} engages ${invName(game, p)}`, {
      inv: p,
      card: e.id,
    });
  }
  push(game, next);
};

export const hunterMovesHandler: Handler<"HunterMoves"> = (game, step) => {
  const done = step.done ?? [];
  const hunters = enemies(game).filter(
    (e) =>
      !done.includes(e.id) &&
      !e.exhausted &&
      !e.engagedWith &&
      def(game, e.id).keywords.includes("hunter") &&
      preyCandidates(game, e.id, invsAt(game, e.location)).length === 0, // stays only with someone it may engage
  );
  if (hunters.length === 0) return;
  const e = hunters[0];
  // "only" prey hunts just its prey; other prey only breaks ties between the nearest
  const lured = lures(game);
  const targets = lured.length
    ? lured
    : (onlyPrey(game, e.id) ? preyCandidates(game, e.id, activeInvs(game)) : activeInvs(game))
        .map((i) => inv(game, i).location!)
        .filter(Boolean);
  const dist = distances(game, e.location!);
  const nearest = Math.min(...targets.map((t) => dist.get(t) ?? Infinity));
  const goals = targets.filter((t) => dist.get(t) === nearest);
  let options = stepsToward(game, e.location!, goals).filter((l) => canEnemyEnter(game, e.id, l));
  if (options.length === 0 || nearest === Infinity) {
    push(game, { ...step, choice: undefined, done: [...done, e.id] });
    return;
  }
  // the first hunter that actually moves this phase opens the step
  if (!step.stepped && step.choice === undefined) logStep(game, "hunters");
  const next: Step = { ...step, choice: undefined, done: [...done, e.id], stepped: true };
  if (options.length > 1 && !lured.length) {
    // prefer the path toward prey
    const preyInvs = preyCandidates(
      game,
      e.id,
      activeInvs(game).filter((i) => goals.includes(inv(game, i).location!)),
    );
    const preyLocs = preyInvs.map((i) => inv(game, i).location!);
    const toward = stepsToward(game, e.location!, preyLocs).filter((l) => options.includes(l));
    if (toward.length) options = toward;
  }
  const to = ask<InstId>(
    game,
    step,
    leadInvestigator(game),
    CHOICE.Target,
    `Where does ${def(game, e.id).name} move?`,
    options.map((l) => ({ id: l, label: def(game, l).name, card: l, value: l })),
    { auto: true, key: "enemyMoveWhere", vars: { card: e.id } },
  );
  if (to === undefined) return;
  const from = e.location;
  setCardLocation(game, e.id, to);
  emit(game, EVENT.EnemyMove, `${def(game, e.id).name} moves to ${def(game, to).name}`, {
    card: e.id,
    data: { from, to },
  });
  const p = preyCandidates(game, e.id, invsAt(game, to))[0];
  if (p && !isAloof(game, e.id) && !isMassive(game, e.id)) {
    setEngaged(game, e.id, p);
    emit(game, EVENT.Engage, `${def(game, e.id).name} engages ${invName(game, p)}`, {
      inv: p,
      card: e.id,
    });
    push(
      game,
      win("enemyEntersLocation", { enemy: e.id, location: to }),
      win("enemyEngages", { inv: p, enemy: e.id }),
      next,
    );
  } else push(game, win("enemyEntersLocation", { enemy: e.id, location: to }), next);
};

export const enemyAttacksHandler: Handler<"EnemyAttacks"> = (game, step) => {
  const done = step.done ?? [];
  for (const i of turnOrder(game)) {
    if (inv(game, i).status !== "playing") continue;
    for (const e of engagedWith(game, i)) {
      const key = `${i}|${e.id}`;
      if (done.includes(key) || e.exhausted) continue;
      if (!done.length) logStep(game, "attacks");
      // the chart's player window follows the last of an investigator's attacks
      const more = engagedWith(game, i).some(
        (x) => x.id !== e.id && !x.exhausted && !done.includes(`${i}|${x.id}`),
      );
      // a non-massive enemy exhausts as soon as its attack has resolved; a massive one after its last (the loop below)
      const exhaust: Step[] = isMassive(game, e.id) ? [] : [{ t: STEP.ExhaustEnemy, enemy: e.id }];
      push(
        game,
        { t: STEP.EnemyAttack, enemy: e.id, inv: i, aoo: false, key: attackKey(game) },
        // a swarm card attacks as the enemy, each its own attack
        ...swarmOf(game, e.id).map((): Step => ({
          t: STEP.EnemyAttack,
          enemy: e.id,
          inv: i,
          aoo: false,
          key: attackKey(game),
        })),
        // Relentless: it readies and attacks again, once, before it exhausts
        ...(hasKeyword(game, e.id, "relentless")
          ? [{ t: STEP.RelentlessAttack, enemy: e.id, inv: i } as Step]
          : []),
        ...exhaust,
        ...(more ? [] : [win("playerWindow", { phase: "enemy", inv: i })]),
        { ...step, choice: undefined, done: [...done, key] },
      );
      return;
    }
  }
  // each enemy that attacked exhausts
  for (const key of done) {
    const id = key.split("|")[1];
    if (cardIf(game, id)?.zone === "enemy") exhaust(game, id);
  }
};

/** the second attack of a Relentless enemy, if it is still there to make it */
export const relentlessAttackHandler: Handler<"RelentlessAttack"> = (game, step) => {
  const e = cardIf(game, step.enemy);
  if (e?.zone !== "enemy" || e.engagedWith !== step.inv || inv(game, step.inv).status !== "playing")
    return;
  ready(game, e.id);
  emit(game, EVENT.Ready, `${def(game, e.id).name} readies and attacks again`, { card: e.id });
  push(game, { t: STEP.EnemyAttack, enemy: e.id, inv: step.inv, aoo: false, key: attackKey(game) });
};

/**
 * Predator (Children of Blood): after the enemies attack, each ready unengaged predator attacks a non-Elite enemy at its
 * location (of its trait, when its keyword names one; the lead chooses among several), dealing its damage; a prey
 * defeated so is defeated "via the predator keyword". The predator exhausts after its attack.
 */
export const predatorAttacksHandler: Handler<"PredatorAttacks"> = (game, step) => {
  const done = step.done ?? [];
  const preyOf = (p: InstId) => {
    const trait = keywordArg(game, p, "predator");
    return enemiesAt(game, card(game, p).location).filter(
      (x) =>
        x.id !== p && !isElite(game, x.id) && (!trait || def(game, x.id).traits.includes(trait)),
    );
  };
  const p = enemies(game).find(
    (x) =>
      !done.includes(x.id) &&
      !x.exhausted &&
      !x.engagedWith &&
      (hasKeyword(game, x.id, "predator") || keywordArg(game, x.id, "predator") !== undefined) &&
      preyOf(x.id).length > 0,
  );
  if (!p) return;
  const prey = ask<InstId>(
    game,
    step,
    leadInvestigator(game),
    CHOICE.Target,
    `Which enemy does ${def(game, p.id).name} attack?`,
    preyOf(p.id).map((x) => ({ id: x.id, label: def(game, x.id).name, card: x.id, value: x.id })),
    { auto: true, key: "predatorPrey", vars: { card: p.id } },
  );
  if (prey === undefined) return;
  emit(game, EVENT.Attack, `${def(game, p.id).name} attacks ${def(game, prey).name}`, {
    card: p.id,
    data: { prey },
  });
  push(
    game,
    {
      t: STEP.DamageEnemy,
      enemy: prey,
      amount: enemyStat(game, p.id, "damage"),
      by: null,
      source: p.id,
      via: "predator",
    },
    { t: STEP.ExhaustEnemy, enemy: p.id },
    { t: STEP.PredatorAttacks, done: [...done, p.id] },
  );
};

export const addSwarmHandler: Handler<"AddSwarm"> = (game, step) => {
  if (cardIf(game, step.host)?.zone !== "enemy") return;
  const top = inv(game, step.inv).deck.slice(0, step.n);
  for (const id of top) putBeneath(game, id, step.host);
  if (top.length)
    emit(game, EVENT.Swarm, `${top.length} swarm card(s) beneath ${def(game, step.host).name}`, {
      card: step.host,
      inv: step.inv,
    });
};

export function exhaustEnemy(game: GameContext, id: InstId) {
  if (cardIf(game, id)?.zone === "enemy") exhaust(game, id);
}

export const enemyEngageHandler: Handler<"EnemyEngage"> = (game, step) => {
  const e = card(game, step.enemy);
  setEngaged(game, e.id, step.inv);
  setCardLocation(game, e.id, inv(game, step.inv).location);
  emit(game, EVENT.Engage, `${invName(game, step.inv)} engages ${def(game, step.enemy).name}`, {
    inv: step.inv,
    card: step.enemy,
    data: { byInv: true },
  });
  push(game, win("enemyEngages", { inv: step.inv, enemy: step.enemy }));
};

export const handlers = {
  ExhaustEnemy: (game: GameContext, step: StepOf<"ExhaustEnemy">) => exhaustEnemy(game, step.enemy),
  Elusive: (game: GameContext, step: StepOf<"Elusive">) => elusive(game, step.enemy, step),
  Spawn: spawnHandler,
  EnemyAttack: enemyAttackHandler,
  ResolveAttack: resolveAttackHandler,
  DamageEnemy: damageEnemyHandler,
  DefeatEnemy: defeatEnemyHandler,
  PatrolMoves: patrolMovesHandler,
  HunterMoves: hunterMovesHandler,
  EnemyAttacks: enemyAttacksHandler,
  RelentlessAttack: relentlessAttackHandler,
  PredatorAttacks: predatorAttacksHandler,
  AddSwarm: addSwarmHandler,
  EnemyEngage: enemyEngageHandler,
};

/** can the enemy move into the location: Barricade keeps non-Elite enemies out; "cannotMoveInto" (the unrevealed Parlor) binds investigators only */
export function canEnemyEnter(game: GameContext, enemy: InstId, loc: InstId): boolean {
  return !(hasFlag(game, loc, "nonEliteCannotMoveInto") && !isElite(game, enemy));
}
