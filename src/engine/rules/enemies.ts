import {
  logStep,
  activeInvs,
  ask,
  card,
  def,
  distances,
  emit,
  enemies,
  enemyStat,
  engagedWith,
  hasFlag,
  inv,
  invName,
  invsAt,
  isElite,
  isMassive,
  locationByName,
  locations,
  moveCard,
  push,
  remainingHealth,
  remainingSanity,
  skillValue,
  stepsToward,
  type G,
} from "../core";
import type { InstId, InvId, Step } from "../types";
import { win } from "./cards";

type Handler<T extends Step["t"]> = (g: G, step: Extract<Step, { t: T }>) => void;

/** investigators among candidates that match the enemy's prey instruction */
export function preyCandidates(g: G, enemy: InstId, candidates: InvId[]): InvId[] {
  const prey = def(g, enemy).prey;
  if (!prey) return candidates;
  // "only" prey never falls back to others: with nobody matching it engages and hunts no one
  if (prey === "bearer") return candidates.filter((i) => i === card(g, enemy).owner);
  if ("only" in prey) return candidates.filter((i) => card(g, inv(g, i).cardId).code === prey.only);
  if (candidates.length <= 1) return candidates;
  const [dir, stat] = "highest" in prey ? [1, prey.highest] : [-1, prey.lowest];
  const val = (i: InvId) => {
    switch (stat) {
      case "clues":
        return inv(g, i).clues;
      case "remainingHealth":
        return remainingHealth(g, i);
      case "remainingSanity":
        return remainingSanity(g, i);
      case "cardsInHand":
        return inv(g, i).hand.length;
      default:
        return skillValue(g, i, stat);
    }
  };
  const best = Math.max(...candidates.map((i) => dir * val(i)));
  return candidates.filter((i) => dir * val(i) === best);
}

/** Prey - bearer only / Prey - X only: the enemy ignores every other investigator */
export function onlyPrey(g: G, enemy: InstId) {
  const prey = def(g, enemy).prey;
  return prey === "bearer" || (!!prey && "only" in prey);
}

// ---------- spawning ----------
export const spawnHandler: Handler<"Spawn"> = (g, step) => {
  const d = def(g, step.enemy);
  const c = card(g, step.enemy);
  let at = step.at ?? null;
  let engage: InvId | null = null;
  const drawerLoc = step.inv ? inv(g, step.inv).location : null;
  const hook = g.db.scripts[g.s.scenarioId]?.hooks?.spawnRedirect;
  if (!at && hook) {
    const ctx = { enemy: step.enemy, location: null as InstId | null };
    hook(g, ctx);
    at = ctx.location;
  }
  if (!at && d.spawn) {
    if (d.spawn === "emptyLocation" || d.spawn === "farthestEmptyLocation") {
      let empty = locations(g).filter(
        (l) => invsAt(g, l.id).length === 0 && !enemies(g).some((e) => e.location === l.id),
      );
      // the farthest from the investigator who drew it (The Nameless Lurker)
      if (d.spawn === "farthestEmptyLocation" && drawerLoc && empty.length) {
        const dist = distances(g, drawerLoc);
        const far = Math.max(...empty.map((l) => dist.get(l.id) ?? -1));
        empty = empty.filter((l) => (dist.get(l.id) ?? -1) === far);
      }
      if (empty.length) {
        const pick = ask<InstId>(
          g,
          step,
          g.s.lead,
          "target",
          `Choose an empty location to spawn ${d.name}`,
          empty.map((l) => ({ id: l.id, label: def(g, l.id).name, card: l.id, value: l.id })),
          { auto: true, key: "spawnAt", vars: { card: step.enemy } },
        );
        if (pick === undefined) return;
        at = pick;
      }
    } else if (d.spawn === "Engaged with Prey") {
      const cands = preyCandidates(g, step.enemy, activeInvs(g));
      if (!cands.length) {
        emit(g, "spawnFail", `${d.name} has no prey in play and is discarded`, {
          card: step.enemy,
        });
        moveCard(g, step.enemy, c.owner ? "discard" : "encounterDiscard");
        return;
      }
      const pick = ask<InvId>(
        g,
        step,
        g.s.lead,
        "target",
        `${d.name} spawns engaged with:`,
        cands.map((i) => ({ id: i, label: invName(g, i), card: inv(g, i).cardId, value: i })),
        { auto: true, key: "spawnEngaged", vars: { card: step.enemy } },
      );
      if (pick === undefined) return;
      engage = pick;
      at = inv(g, pick).location;
    } else {
      const loc = locationByName(g, d.spawn);
      if (!loc) {
        emit(g, "spawnFail", `${d.name} has no spawn location in play and is discarded`, {
          card: step.enemy,
        });
        moveCard(g, step.enemy, c.owner ? "discard" : "encounterDiscard");
        return;
      }
      at = loc.id;
    }
  }
  if (!at) {
    at = drawerLoc;
    engage = step.inv && preyCandidates(g, step.enemy, [step.inv]).length ? step.inv : null;
  }
  if (!at) {
    moveCard(g, step.enemy, c.owner ? "discard" : "encounterDiscard");
    return;
  }
  moveCard(g, step.enemy, "enemy", { location: at });
  // a unique encounter card entering play discards the player card with its title (Grimoire, Unique)
  if (d.unique)
    for (const twin of Object.values(g.s.cards))
      if (twin.owner && twin.zone === "play" && def(g, twin.id).name === d.name)
        moveCard(g, twin.id, "discard", { inv: twin.owner });
  emit(g, "spawn", `${d.name} spawns at ${def(g, at).name}`, { card: step.enemy, data: { at } });
  const aloof = d.keywords.includes("aloof");
  if (!engage && !aloof && !isMassive(g, step.enemy)) {
    // ponytail: first tied prey in player order; lead choice if it ever matters
    engage = preyCandidates(g, step.enemy, invsAt(g, at))[0] ?? null;
  }
  if (engage && !aloof && !isMassive(g, step.enemy)) {
    c.engagedWith = engage;
    emit(g, "engage", `${d.name} engages ${invName(g, engage)}`, { inv: engage, card: step.enemy });
  }
  push(
    g,
    win("enemySpawns", { inv: step.inv, enemy: step.enemy, location: at }),
    win("enemyEntersLocation", { enemy: step.enemy, location: at }),
    win("enterPlay", { card: step.enemy, enemy: step.enemy }),
    ...(engage ? [win("enemyEngages", { inv: engage, enemy: step.enemy })] : []),
    { t: "CheckObjectives" },
  );
};

// ---------- attacks ----------
export const enemyAttackHandler: Handler<"EnemyAttack"> = (g, step) => {
  push(g, win("enemyAttacks", { inv: step.inv, enemy: step.enemy, key: step.key }), {
    t: "ResolveAttack",
    enemy: step.enemy,
    inv: step.inv,
    key: step.key,
  });
};

export const resolveAttackHandler: Handler<"ResolveAttack"> = (g, step) => {
  const e = g.s.cards[step.enemy];
  if (!e || e.zone !== "enemy" || inv(g, step.inv).status !== "playing") return;
  if (g.s.cancelled.includes(step.key)) {
    emit(g, "attackCancelled", `${def(g, step.enemy).name}'s attack is cancelled`, {
      card: step.enemy,
    });
    push(g, win("enemyAttacked", { inv: step.inv, enemy: step.enemy }));
    return;
  }
  if (!isElite(g, step.enemy) && hasFlag(g, step.inv, "nonEliteCannotAttack")) return;
  const bonus = (g.s.flags[`attackBonus:${step.key}`] as number | undefined) ?? 0;
  delete g.s.flags[`attackBonus:${step.key}`];
  // "if this enemy attacked you this round" (Daniela's Wrench)
  g.s.flags[`attacked:${step.enemy}:${step.inv}`] = g.s.round;
  const damage = enemyStat(g, step.enemy, "damage") + bonus;
  const horror = enemyStat(g, step.enemy, "horror") + bonus;
  emit(
    g,
    "attack",
    `${def(g, step.enemy).name} attacks ${invName(g, step.inv)} (${damage} damage, ${horror} horror)`,
    { inv: step.inv, card: step.enemy, data: { damage, horror } },
  );
  push(
    g,
    // what the attack deals can be prevented before it is assigned (Flesh Ward); the window names what was dealt
    win("attackDealsDamage", { inv: step.inv, enemy: step.enemy, key: step.key, damage, horror }),
    {
      t: "AssignDamage",
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

export function attackKey(g: G) {
  return `atk${g.s.seq++}`;
}

/** attacks of opportunity from each ready engaged enemy */
export function attacksOfOpportunity(g: G, i: InvId): Step[] {
  return engagedWith(g, i)
    .filter((e) => !e.exhausted && !def(g, e.id).keywords.includes("aloof"))
    .map((e) => ({ t: "EnemyAttack", enemy: e.id, inv: i, aoo: true, key: attackKey(g) }));
}

// ---------- damage & defeat ----------
export const damageEnemyHandler: Handler<"DamageEnemy"> = (g, step) => {
  const e = g.s.cards[step.enemy];
  if (!e || e.zone !== "enemy" || step.amount <= 0) return;
  // what an investigator deals can grow, or be capped, before it is placed (Nathaniel Cho, Tommy Malloy)
  if (step.by && !step.windowed) {
    const key = step.key ?? `dmg${g.s.seq++}`;
    push(
      g,
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
  let amount = step.amount + ((g.s.flags[`damageBonus:${step.key}`] as number | undefined) ?? 0);
  delete g.s.flags[`damageBonus:${step.key}`];
  if (hasFlag(g, step.enemy, "damageCapOne")) amount = Math.min(amount, 1);
  const health = enemyStat(g, step.enemy, "health");
  const excess = e.damage + amount - health;
  e.damage += amount;
  emit(
    g,
    "enemyDamage",
    `${def(g, step.enemy).name} takes ${amount} damage (${e.damage}/${health})`,
    { card: step.enemy, data: { amount } },
  );
  // after an investigator's damage is placed (In Harm's Way)
  if (step.by) push(g, win("enemyDamaged", { inv: step.by, enemy: step.enemy, amount }));
  if (e.damage >= health) {
    push(
      g,
      ...(excess > 0 && step.by
        ? [win("excessDamage", { inv: step.by, enemy: step.enemy, amount: excess })]
        : []),
      { t: "DefeatEnemy", enemy: step.enemy, by: step.by },
    );
  }
};

export const defeatEnemyHandler: Handler<"DefeatEnemy"> = (g, step) => {
  const e = g.s.cards[step.enemy];
  if (!e || e.zone !== "enemy") return;
  if (!step.fired) {
    // "when defeated" forced abilities resolve while the enemy is still in play
    push(g, win("enemyDefeatedSelf", { enemy: step.enemy, inv: null }), { ...step, fired: true });
    return;
  }
  const d = def(g, step.enemy);
  if (step.by && g.s.invs[step.by]) g.s.invs[step.by].defeatedHealth += d.enemy?.health ?? 0;
  emit(g, "enemyDefeated", `${d.name} is defeated${step.by ? ` by ${invName(g, step.by)}` : ""}`, {
    card: step.enemy,
    inv: step.by,
    data: { by: step.by ?? null },
  });
  if (d.victory !== undefined) moveCard(g, step.enemy, "victory");
  else moveCard(g, step.enemy, e.owner ? "discard" : "encounterDiscard");
  g.s.flags[`defeated:${e.code}`] = true;
  push(g, win("enemyDefeated", { inv: step.by }), { t: "CheckObjectives" });
};

// ---------- enemy phase ----------
export const hunterMovesHandler: Handler<"HunterMoves"> = (g, step) => {
  const done = step.done ?? [];
  const hunters = enemies(g).filter(
    (e) =>
      !done.includes(e.id) &&
      !e.exhausted &&
      !e.engagedWith &&
      def(g, e.id).keywords.includes("hunter") &&
      preyCandidates(g, e.id, invsAt(g, e.location)).length === 0, // stays only with someone it may engage
  );
  if (hunters.length === 0) return;
  const e = hunters[0];
  // "only" prey hunts just its prey; other prey only breaks ties between the nearest
  const targets = (onlyPrey(g, e.id) ? preyCandidates(g, e.id, activeInvs(g)) : activeInvs(g))
    .map((i) => inv(g, i).location!)
    .filter(Boolean);
  const dist = distances(g, e.location!);
  const nearest = Math.min(...targets.map((t) => dist.get(t) ?? Infinity));
  const goals = targets.filter((t) => dist.get(t) === nearest);
  let options = stepsToward(g, e.location!, goals).filter((l) => canEnemyEnter(g, e.id, l));
  if (options.length === 0 || nearest === Infinity) {
    push(g, { ...step, choice: undefined, done: [...done, e.id] });
    return;
  }
  // the first hunter that actually moves this phase opens the step
  if (!step.stepped && step.choice === undefined) logStep(g, "hunters");
  const next: Step = { ...step, choice: undefined, done: [...done, e.id], stepped: true };
  if (options.length > 1) {
    // prefer the path toward prey
    const preyInvs = preyCandidates(
      g,
      e.id,
      activeInvs(g).filter((i) => goals.includes(inv(g, i).location!)),
    );
    const preyLocs = preyInvs.map((i) => inv(g, i).location!);
    const toward = stepsToward(g, e.location!, preyLocs).filter((l) => options.includes(l));
    if (toward.length) options = toward;
  }
  const to = ask<InstId>(
    g,
    step,
    g.s.lead,
    "target",
    `Where does ${def(g, e.id).name} move?`,
    options.map((l) => ({ id: l, label: def(g, l).name, card: l, value: l })),
    { auto: true, key: "enemyMoveWhere", vars: { card: e.id } },
  );
  if (to === undefined) return;
  const from = e.location;
  e.location = to;
  emit(g, "enemyMove", `${def(g, e.id).name} moves to ${def(g, to).name}`, {
    card: e.id,
    data: { from, to },
  });
  const p = preyCandidates(g, e.id, invsAt(g, to))[0];
  if (p && !def(g, e.id).keywords.includes("aloof") && !isMassive(g, e.id)) {
    e.engagedWith = p;
    emit(g, "engage", `${def(g, e.id).name} engages ${invName(g, p)}`, { inv: p, card: e.id });
    push(
      g,
      win("enemyEntersLocation", { enemy: e.id, location: to }),
      win("enemyEngages", { inv: p, enemy: e.id }),
      next,
    );
  } else push(g, win("enemyEntersLocation", { enemy: e.id, location: to }), next);
};

export const enemyAttacksHandler: Handler<"EnemyAttacks"> = (g, step) => {
  const done = step.done ?? [];
  for (const i of g.s.order) {
    if (inv(g, i).status !== "playing") continue;
    for (const e of engagedWith(g, i)) {
      const key = `${i}|${e.id}`;
      if (done.includes(key) || e.exhausted) continue;
      if (!done.length) logStep(g, "attacks");
      // the chart's player window follows the last of an investigator's attacks
      const more = engagedWith(g, i).some(
        (x) => x.id !== e.id && !x.exhausted && !done.includes(`${i}|${x.id}`),
      );
      // a non-massive enemy exhausts as soon as its attack has resolved; a massive one after its last (the loop below)
      const exhaust: Step[] = isMassive(g, e.id)
        ? []
        : [{ t: "Script", code: "__engine", fn: "exhaustEnemy", ctx: { enemy: e.id } }];
      push(
        g,
        { t: "EnemyAttack", enemy: e.id, inv: i, aoo: false, key: attackKey(g) },
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
    if (g.s.cards[id]?.zone === "enemy") g.s.cards[id].exhausted = true;
  }
};

export function exhaustEnemy(g: G, id: InstId) {
  if (g.s.cards[id]?.zone === "enemy") g.s.cards[id].exhausted = true;
}

export const enemyEngageHandler: Handler<"EnemyEngage"> = (g, step) => {
  const e = card(g, step.enemy);
  e.engagedWith = step.inv;
  e.location = inv(g, step.inv).location;
  emit(g, "engage", `${invName(g, step.inv)} engages ${def(g, step.enemy).name}`, {
    inv: step.inv,
    card: step.enemy,
    data: { byInv: true },
  });
  push(g, win("enemyEngages", { inv: step.inv, enemy: step.enemy }));
};

export const handlers = {
  Spawn: spawnHandler,
  EnemyAttack: enemyAttackHandler,
  ResolveAttack: resolveAttackHandler,
  DamageEnemy: damageEnemyHandler,
  DefeatEnemy: defeatEnemyHandler,
  HunterMoves: hunterMovesHandler,
  EnemyAttacks: enemyAttacksHandler,
  EnemyEngage: enemyEngageHandler,
};

/** can the enemy move into the location: Barricade keeps non-Elite enemies out; "cannotMoveInto" (the unrevealed Parlor) binds investigators only */
export function canEnemyEnter(g: G, enemy: InstId, loc: InstId): boolean {
  return !(hasFlag(g, loc, "nonEliteCannotMoveInto") && !isElite(g, enemy));
}
