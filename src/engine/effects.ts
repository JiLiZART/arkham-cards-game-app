import type { Amount, Effect, EnemyTarget, InvTarget } from "../content/schema";
import {
  activeInvs, ask, card, cardsIn, checkCondition, connections, controlled, def, discard, distances, emit, enemies, enemiesAt,
  engagedWith, findByCode, inv, invName, invsAt, isElite, locationByName, locations, matchesFilter, moveCard, playerCount, push,
  addTempMod, type G,
} from "./core";
import { randInt, shuffle } from "./rng";
import { win } from "./rules/cards";
import { basicInvestigate } from "./rules/flow";
import { startTest } from "./rules/skillTest";
import type { EffCtx, InstId, InvId, Step } from "./types";

type EffStep = Extract<Step, { t: "Eff" }>;

function amt(g: G, a: Amount, ctx: EffCtx): number {
  if (typeof a === "number") return a;
  if (typeof a === "object") return a.perInvestigator * playerCount(g);
  if (a === "failBy") return ctx.failBy ?? 0;
  if (a === "succeedBy") return ctx.succeedBy ?? 0;
  if (a === "X") return ctx.x ?? 0;
  return Infinity; // "all"
}

const opt = (g: G, id: InstId, label?: string) => ({ id, label: label ?? def(g, id).name, card: id, value: id });

/** resolve investigator targets; undefined = waiting for a choice */
function invTargets(g: G, step: EffStep, t: InvTarget | undefined, ctx: EffCtx): InvId[] | undefined {
  const you = ctx.you!;
  switch (t ?? "you") {
    case "you": return you ? [you] : [];
    case "lead": return [g.s.lead];
    case "each": return activeInvs(g);
    case "eachAtLocation": return invsAt(g, inv(g, you).location);
    case "eventInvestigator": return ctx.inv ? [ctx.inv] : [];
    case "chooseAtLocation": {
      const here = invsAt(g, inv(g, you).location);
      if (!here.length) return [];
      const pick = ask<InvId>(g, step, you, "target", "Choose an investigator", here.map((i) => ({ id: i, label: invName(g, i), card: inv(g, i).cardId, value: i })), { auto: true, key: "chooseInvestigator" });
      if (pick === undefined) return undefined;
      // chosen (or auto-picked as the only one): re-run with a fixed target so later choices of this effect
      // (e.g. Old Book of Lore's search) get a fresh answer slot instead of reading this one
      push(g, { ...step, choice: undefined, effect: { ...step.effect, target: "eventInvestigator" } as Effect, ctx: { ...ctx, inv: pick } });
      return undefined;
    }
  }
}

function nearest(g: G, from: InstId | null, filter: (id: InstId) => boolean): InstId[] {
  const cands = enemies(g).filter((e) => filter(e.id));
  if (!from || !cands.length) return cands.map((e) => e.id);
  const d = distances(g, from);
  const best = Math.min(...cands.map((e) => d.get(e.location!) ?? Infinity));
  return cands.filter((e) => (d.get(e.location!) ?? Infinity) === best).map((e) => e.id);
}

/** resolve enemy targets; undefined = waiting */
function enemyTargets(g: G, step: EffStep, t: EnemyTarget, ctx: EffCtx): InstId[] | undefined {
  const you = ctx.you;
  const loc = you ? inv(g, you).location : null;
  const choose = (ids: InstId[], prompt: string) => {
    if (!ids.length) return [];
    const pick = ask<InstId>(g, step, you ?? g.s.lead, "target", prompt, ids.map((id) => opt(g, id)), { auto: true, key: "chooseEnemy" });
    return pick === undefined ? undefined : [pick];
  };
  switch (t) {
    case "self": return ctx.source && g.s.cards[ctx.source]?.zone === "enemy" ? [ctx.source] : [];
    case "eventEnemy": return ctx.enemy && g.s.cards[ctx.enemy]?.zone === "enemy" ? [ctx.enemy] : [];
    case "eachAtLocation": return enemiesAt(g, loc).map((e) => e.id);
    case "chooseAtLocation": return choose(enemiesAt(g, loc).map((e) => e.id), "Choose an enemy at your location");
    case "chooseExhaustedAtLocation": return choose(enemiesAt(g, loc).filter((e) => e.exhausted).map((e) => e.id), "Choose an exhausted enemy");
    case "nearestCultist": return choose(nearest(g, loc, (id) => def(g, id).traits.includes("Cultist")), "Choose the nearest Cultist enemy");
    case "nearestEnemy": return choose(nearest(g, loc, () => true), "Choose the nearest enemy");
  }
}

export const effectsHandler = (g: G, step: Extract<Step, { t: "Effects" }>) => {
  push(g, ...step.effects.map((effect): Step => ({ t: "Eff", effect, ctx: step.ctx })));
};

export const effHandler = (g: G, step: EffStep) => {
  if (g.s.phase === "ended") return;
  const e = step.effect;
  const ctx = step.ctx;
  const you = ctx.you ?? g.s.lead;
  const src = ctx.source ? g.s.cards[ctx.source] : undefined;
  switch (e.op) {
    case "gainResources":
    case "loseResources":
    case "drawCards": {
      const ts = invTargets(g, step, e.target, ctx);
      if (!ts) return;
      for (const i of ts) {
        const me = inv(g, i);
        const n = amt(g, e.amount, ctx);
        if (e.op === "gainResources") {
          me.resources += n;
          emit(g, "resource", `${me.name} gains ${n} resources`, { inv: i, data: { n } });
        } else if (e.op === "loseResources") {
          const lost = Math.min(n, me.resources);
          me.resources -= lost;
          emit(g, "resource", `${me.name} loses ${lost} resources`, { inv: i, data: { n: lost, lost: true, source: ctx.source ?? null } });
        } else push(g, { t: "Draw", inv: i, n });
      }
      return;
    }
    case "discoverClues": {
      const loc = e.at === "testLocation" ? ctx.location : inv(g, you).location;
      if (loc) push(g, { t: "DiscoverClues", inv: you, location: loc, n: amt(g, e.amount, ctx) });
      return;
    }
    case "takeDamage":
    case "takeHorror": {
      const ts = invTargets(g, step, e.target, ctx);
      if (!ts) return;
      const n = amt(g, e.amount, ctx);
      if (n <= 0) return;
      for (const i of ts) push(g, { t: "AssignDamage", inv: i, damage: e.op === "takeDamage" ? n : 0, horror: e.op === "takeHorror" ? n : 0, direct: !!e.direct, source: ctx.source ?? null });
      return;
    }
    case "heal": {
      // an Ally asset may be healed instead of an investigator: choose who first, then heal them
      if (e.targetAlly && ctx.you) {
        const mine = ctx.you;
        const people = e.target === "you" ? [mine] : invsAt(g, inv(g, mine).location);
        const allies = Object.values(g.s.cards).filter((c) => c.zone === "play" && c.controller && def(g, c.id).traits.includes("Ally") && (e.targetAlly === "controlled" ? c.controller === mine : inv(g, c.controller).location === inv(g, mine).location));
        const opts = [...people.map((i) => ({ id: i, label: invName(g, i), card: inv(g, i).cardId, value: i })), ...allies.map((a) => ({ id: a.id, label: def(g, a.id).name, card: a.id, value: a.id }))];
        const pick = ask<string>(g, step, mine, "target", "Choose who to heal", opts, { auto: true, key: "chooseHealTarget" });
        if (pick === undefined) return;
        const asset = g.s.cards[pick];
        if (asset) {
          const d = Math.min(e.damage ?? 0, asset.damage);
          const h = Math.min(e.horror ?? 0, asset.horror);
          asset.damage -= d;
          asset.horror -= h;
          if (d || h) emit(g, "heal", `${def(g, asset.id).name} heals ${d} damage and ${h} horror`, { card: asset.id, data: { damage: d, horror: h } });
          return;
        }
        push(g, { ...step, choice: undefined, effect: { ...e, target: "eventInvestigator", targetAlly: undefined } as Effect, ctx: { ...ctx, inv: pick } });
        return;
      }
      const ts = invTargets(g, step, e.target, ctx);
      if (!ts) return;
      for (const i of ts) {
        const me = inv(g, i);
        const d = Math.min(e.damage ?? 0, me.damage);
        const h = Math.min(e.horror ?? 0, me.horror);
        me.damage -= d;
        me.horror -= h;
        if (d || h) emit(g, "heal", `${me.name} heals ${d} damage and ${h} horror`, { inv: i, data: { damage: d, horror: h } });
      }
      return;
    }
    case "dealDamage": {
      const ts = enemyTargets(g, step, e.to, ctx);
      if (!ts) return;
      for (const id of ts) push(g, { t: "DamageEnemy", enemy: id, amount: amt(g, e.amount, ctx), by: ctx.you ?? null });
      return;
    }
    case "placeDoom": {
      const n = amt(g, e.amount, ctx);
      if (e.on === "agenda") {
        if (g.s.agenda) push(g, { t: "PlaceDoom", card: g.s.agenda, n });
      } else if (e.on === "self") {
        if (ctx.source) push(g, { t: "PlaceDoom", card: ctx.source, n });
      } else if (e.on === "eachCultist") {
        for (const c of enemies(g).filter((x) => def(g, x.id).traits.includes("Cultist"))) push(g, { t: "PlaceDoom", card: c.id, n });
      } else {
        const ts = enemyTargets(g, step, e.on, ctx);
        if (!ts) return;
        for (const id of ts) push(g, { t: "PlaceDoom", card: id, n });
      }
      return;
    }
    case "placeTokens": {
      if (!src) return;
      src.clues += e.clues ?? 0;
      src.horror += e.horror ?? 0;
      src.damage += e.damage ?? 0;
      src.doom += e.doom ?? 0;
      src.resources += e.resources ?? 0;
      if (e.resources) inv(g, you).resources -= e.resources;
      return;
    }
    case "putInThreatArea":
      if (!src) return;
      moveCard(g, src.id, "threat");
      src.controller = you;
      emit(g, "threat", `${def(g, src.id).name} enters ${invName(g, you)}'s threat area`, { inv: you, card: src.id });
      return;
    case "attachToLocation": {
      if (!src) return;
      let cands = e.where === "yours" ? [inv(g, you).location!].filter(Boolean) : locations(g).map((l) => l.id);
      if (e.limitOnePerLocation) cands = cands.filter((l) => !cardsIn(g, "attached").some((a) => a.location === l && a.code === src.code));
      if (e.where === "mostClues" && cands.length) {
        const most = Math.max(...cands.map((l) => card(g, l).clues));
        cands = cands.filter((l) => card(g, l).clues === most);
      }
      if (!cands.length) {
        discard(g, src.id);
        return;
      }
      const pick = ask<InstId>(g, step, g.s.lead, "target", `Attach ${def(g, src.id).name} to:`, cands.map((l) => opt(g, l)), { auto: true, key: "attach", vars: { card: src.id } });
      if (pick === undefined) return;
      moveCard(g, src.id, "attached", { location: pick });
      emit(g, "attach", `${def(g, src.id).name} is attached to ${def(g, pick).name}`, { card: src.id });
      return;
    }
    case "discardSelf":
      if (src && src.zone !== "discard" && src.zone !== "encounterDiscard") discard(g, src.id);
      return;
    case "addSelfToVictory":
      if (!src) return;
      moveCard(g, src.id, "victory");
      emit(g, "victory", `${def(g, src.id).name} is added to the victory display`, { card: src.id });
      push(g, { t: "CheckObjectives" });
      return;
    case "removeSelf":
      if (src) moveCard(g, src.id, "removed");
      return;
    case "returnSelfToHand":
      if (src?.owner) moveCard(g, src.id, "hand");
      return;
    case "skillTest": {
      const skills = Array.isArray(e.skill) ? e.skill : [e.skill];
      const skill = ask<typeof skills[number]>(g, step, you, "generic", "Choose which skill to test",
        skills.map((s) => ({ id: s, label: `Test ${s} (${e.difficulty})`, value: s })), { auto: true });
      if (skill === undefined) return;
      startTest(g, { inv: you, skill, kind: "plain", difficulty: e.difficulty, source: ctx.source, onSuccess: e.onSuccess, onFail: e.onFail, perPointFailed: e.perPointFailed, ctx });
      return;
    }
    case "fight": {
      const ts = enemyTargets(g, step, "chooseAtLocation", ctx);
      if (!ts?.length) return;
      const fctx = { ...ctx, enemy: ts[0] };
      const extra = e.extraDamageIf && checkCondition(g, e.extraDamageIf, fctx) ? 1 : 0;
      startTest(g, {
        inv: you, skill: e.skill ?? "combat", kind: "fight", target: ts[0], source: ctx.source, skillBonus: e.bonus, damageBonus: (e.damageBonus ?? 0) + extra,
        onSuccess: e.onSuccess, onFail: e.onFail, onTokens: e.onTokens, marginDamage: e.extraDamageIfSucceedBy, ctx: fctx,
      });
      return;
    }
    case "investigate": {
      const loc = inv(g, you).location;
      if (!loc) return;
      basicInvestigate(g, you, loc, { bonus: e.bonus, shroud: e.shroud, skill: def(g, loc).investigateSkill ?? e.skill, insteadOfClues: e.insteadOfClues, source: ctx.source, onSuccess: e.onSuccess, onFail: e.onFail, onTokens: e.onTokens });
      return;
    }
    case "evade": {
      const loc = inv(g, you).location;
      if (e.all || e.auto) {
        let ts = enemiesAt(g, loc).map((x) => x.id).filter((id) => !e.nonElite || !isElite(g, id));
        if (!e.all) {
          if (!ts.length) return;
          const pick = ask<InstId>(g, step, you, "target", "Choose an enemy to evade", ts.map((id) => opt(g, id)), { auto: true, key: "evade" });
          if (pick === undefined) return;
          ts = [pick];
        }
        for (const id of ts) {
          const en = card(g, id);
          en.exhausted = true;
          en.engagedWith = null;
          emit(g, "evade", `${invName(g, you)} evades ${def(g, id).name}`, { inv: you, card: id });
          push(g, win("enemyEvaded", { inv: you, enemy: id }));
        }
        return;
      }
      const engaged = engagedWith(g, you).map((x) => x.id);
      if (!engaged.length) return;
      const pick = ask<InstId>(g, step, you, "target", "Choose an enemy to evade", engaged.map((id) => opt(g, id)), { auto: true, key: "evade" });
      if (pick === undefined) return;
      startTest(g, { inv: you, skill: e.skill ?? "agility", kind: "evade", target: pick, source: ctx.source, skillBonus: e.bonus, onSuccess: e.onSuccess, onFail: e.onFail, onTokens: e.onTokens, ctx: { ...ctx, enemy: pick } });
      return;
    }
    case "modify": {
      const tester = g.s.skillTest?.inv;
      const target = e.until === "test" && tester ? tester : invTargets(g, step, e.target, ctx)?.[0];
      if (!target) return;
      addTempMod(g, e.mod, target, e.until, ctx.source ?? null);
      emit(g, "modify", `${invName(g, target)} gets ${e.mod.stat ?? e.mod.flag}${e.mod.value !== undefined ? ` ${e.mod.value >= 0 ? "+" : ""}${e.mod.value}` : ""} until end of ${e.until}`, { inv: target });
      return;
    }
    case "chooseOne": {
      const opts = e.options.filter((o) => !o.condition || checkCondition(g, o.condition, ctx));
      if (!opts.length) return;
      const who = e.chooser === "lead" ? g.s.lead : you;
      const pick = ask<number>(g, step, who, "generic", "Choose one:", opts.map((o, k) => ({ id: String(k), label: o.label, value: k })), { auto: true, key: "chooseOne" });
      if (pick === undefined) return;
      push(g, { t: "Effects", effects: opts[pick].effects, ctx });
      return;
    }
    case "discardFromHand": {
      const ts = invTargets(g, step, e.target, ctx);
      if (!ts) return;
      const i = ts[0];
      const me = inv(g, i);
      let n = Math.min(amt(g, e.amount, ctx), me.hand.length);
      if (e.random) {
        for (const t of ts) {
          const m = inv(g, t);
          for (let k = 0; k < n && m.hand.length; k++) {
            const id = m.hand[randInt(g.s, m.hand.length)];
            discard(g, id);
          }
        }
        return;
      }
      if (n <= 0) return;
      const pick = ask<InstId>(g, step, i, "generic", `${me.name}: choose a card to discard (${n})`, me.hand.map((h) => opt(g, h)), { key: "discardN", vars: { n } });
      if (pick === undefined) return;
      discard(g, pick);
      n--;
      if (n > 0) push(g, { ...step, choice: undefined, effect: { ...e, amount: n, target: "you" }, ctx: { ...ctx, you: i } });
      return;
    }
    case "discardAsset": {
      const assets = controlled(g, you).filter((c) => def(g, c.id).type === "asset" && !def(g, c.id).subtype);
      if (!assets.length) {
        if (e.orElse) push(g, { t: "Effects", effects: e.orElse, ctx });
        return;
      }
      const pick = ask<InstId>(g, step, you, "generic", "Choose an asset to discard", assets.map((a) => opt(g, a.id)), { key: "discardAsset" });
      if (pick === undefined) return;
      discard(g, pick);
      return;
    }
    case "discardAllButOneFromHand": {
      const me = inv(g, you);
      if (me.hand.length <= 1) return;
      const keep = ask<InstId>(g, step, you, "generic", "Choose 1 card to keep", me.hand.map((h) => opt(g, h)), { key: "keepOne" });
      if (keep === undefined) return;
      for (const h of me.hand.filter((x) => x !== keep)) discard(g, h);
      return;
    }
    case "removeDiscardFromGame": {
      const me = inv(g, you);
      for (const id of me.discard.slice()) moveCard(g, id, "removed");
      emit(g, "remove", `${me.name}'s discard pile is removed from the game`, { inv: you });
      return;
    }
    case "drawEncounterCard":
      push(g, { t: "DrawEncounter", inv: you });
      return;
    case "gainActions":
      inv(g, you).actionsLeft += e.amount;
      emit(g, "actions", `${invName(g, you)} gains ${e.amount} action(s)`, { inv: you, data: { n: e.amount } });
      return;
    case "cancel":
      if (ctx.key) g.s.cancelled.push(ctx.key);
      return;
    case "disengageAll":
      for (const en of enemies(g)) {
        if (en.engagedWith === you && !(e.nonTrait && def(g, en.id).traits.includes(e.nonTrait))) en.engagedWith = null;
      }
      return;
    case "moveTo": {
      const from = inv(g, you).location;
      let cands: InstId[] = [];
      if (e.where === "connecting" && from) cands = connections(g, from);
      if (e.where === "revealedNoEnemies") cands = locations(g).filter((l) => l.revealed && enemiesAt(g, l.id).length === 0).map((l) => l.id);
      if (e.where === "central") cands = locations(g).filter((l) => def(g, l.id).traits.includes("Central")).map((l) => l.id);
      if (e.where === "choose") cands = locations(g).map((l) => l.id);
      cands = cands.filter((l) => l !== from);
      if (!cands.length) return;
      const pick = ask<InstId>(g, step, you, "target", "Choose a location to move to", cands.map((l) => opt(g, l)), { auto: true, key: "chooseMove" });
      if (pick === undefined) return;
      push(g, { t: "Move", inv: you, to: pick });
      return;
    }
    case "searchDeck": {
      const ts = invTargets(g, step, e.target, ctx);
      if (!ts) return;
      const who = ts[0];
      const me = inv(g, who);
      const pool = (e.top ? me.deck.slice(0, e.top) : me.deck).filter((id) => matchesFilter(g, card(g, id).code, e.filter));
      const pick = ask<InstId | "none">(g, step, who, "generic", `Search your deck${e.top ? ` (top ${e.top})` : ""}`,
        [...pool.map((id) => opt(g, id)), { id: "none", label: "Take nothing", value: "none" }]);
      if (pick === undefined) return;
      if (pick !== "none") {
        moveCard(g, pick, "hand");
        emit(g, "search", `${me.name} adds ${def(g, pick).name} to their hand`, { inv: who, card: pick });
      }
      shuffle(g.s, me.deck);
      return;
    }
    case "lookAtTop": {
      const me = inv(g, you);
      emit(g, "look", `${me.name} looks at: ${me.deck.slice(0, e.amount).map((id) => def(g, id).name).join(", ")}`, { inv: you, data: { n: Math.min(e.amount, me.deck.length) } });
      return;
    }
    case "addUses": {
      const here = invsAt(g, inv(g, you).location);
      const cands = cardsIn(g, "play").filter((c) => c.controller && here.includes(c.controller) && matchesFilter(g, c.code, e.filter));
      if (!cands.length) return;
      const pick = ask<InstId>(g, step, you, "target", "Choose an asset", cands.map((c) => opt(g, c.id)), { auto: true, key: "chooseAsset" });
      if (pick === undefined) return;
      card(g, pick).uses += e.amount;
      return;
    }
    case "surge":
      if (ctx.source) g.s.flags[`surge:${ctx.source}`] = true;
      return;
    case "drawCultistOrSearch": {
      const cultists = enemies(g).filter((x) => def(g, x.id).traits.includes("Cultist"));
      if (cultists.length) {
        push(g, { t: "Eff", effect: { op: "placeDoom", amount: 2, on: "nearestCultist" }, ctx });
        return;
      }
      const pool = [...g.s.encounterDeck, ...g.s.encounterDiscard].find((id) => def(g, id).type === "enemy" && def(g, id).traits.includes("Cultist"));
      if (pool) {
        moveCard(g, pool, "resolving");
        shuffle(g.s, g.s.encounterDeck);
        emit(g, "encounter", `${invName(g, you)} draws ${def(g, pool).name}`, { inv: you, card: pool });
        push(g, { t: "Spawn", enemy: pool, inv: you });
      }
      return;
    }
    case "spawnSetAside": {
      const c = findByCode(g, e.code, ["setAside"]);
      if (!c) return;
      const at = e.at ? locationByName(g, e.at) ?? findByCode(g, e.at, ["location"]) : undefined;
      push(g, { t: "Spawn", enemy: c.id, inv: null, at: at?.id ?? null });
      return;
    }
    case "putSetAsideIntoPlay": {
      const c = findByCode(g, e.code, ["setAside"]);
      if (!c) return;
      moveCard(g, c.id, "location");
      emit(g, "location", `${def(g, c.id).name} is put into play`, { card: c.id });
      return;
    }
    case "shuffleIntoEncounterDeck": {
      const id = ctx.enemy;
      if (!id) return;
      moveCard(g, id, "encounterDeck");
      shuffle(g.s, g.s.encounterDeck);
      emit(g, "shuffle", `${def(g, id).name} is shuffled into the encounter deck`, { card: id });
      return;
    }
    case "takeControl":
      if (!src) return;
      moveCard(g, src.id, "play");
      src.controller = you;
      emit(g, "control", `${invName(g, you)} takes control of ${def(g, src.id).name}`, { inv: you, card: src.id });
      push(g, { t: "SlotCheck", inv: you, card: src.id });
      return;
    case "resolution":
      push(g, { t: "Resolution", id: e.id });
      return;
    case "resign":
      push(g, { t: "Defeated", inv: you, by: "resign" });
      return;
    case "checkDoom":
      push(g, { t: "CheckDoom" });
      return;
    case "takeFromDiscard": {
      const me = inv(g, you);
      const pool = me.discard.filter((id) => matchesFilter(g, card(g, id).code, e.filter));
      if (!pool.length) return;
      const pick = ask<InstId>(g, step, you, "generic", "Choose a card from your discard pile", pool.map((id) => opt(g, id)), { auto: true, key: "chooseFromDiscard" });
      if (pick === undefined) return;
      moveCard(g, pick, "hand");
      emit(g, "search", `${me.name} returns ${def(g, pick).name} to their hand`, { inv: you, card: pick });
      return;
    }
    case "preventDamage": {
      if (!ctx.key || !ctx.dealt) return;
      const flag = `prevented:${ctx.key}`;
      const done = (g.s.flags[flag] as [number, number] | undefined) ?? [0, 0];
      const left: [number, number] = [ctx.dealt[0] - done[0], ctx.dealt[1] - done[1]];
      let kind = e.kind;
      if (kind === "either") {
        if (left[0] > 0 && left[1] > 0) {
          const pick = ask<"damage" | "horror">(g, step, you, "generic", "Prevent damage or horror?", [
            { id: "damage", label: "Prevent damage", value: "damage", key: "option.preventDamage" },
            { id: "horror", label: "Prevent horror", value: "horror", key: "option.preventHorror" },
          ], { key: "preventWhich" });
          if (pick === undefined) return;
          kind = pick;
        } else kind = left[0] > 0 ? "damage" : "horror";
      }
      const k = kind === "damage" ? 0 : 1;
      const n = Math.min(e.amount, left[k]);
      if (n <= 0) return;
      const next: [number, number] = [...done];
      next[k] += n;
      g.s.flags[flag] = next;
      emit(g, "prevent", `${invName(g, you)} prevents ${n} ${kind}`, { inv: you, card: ctx.source ?? null, data: { damage: kind === "damage" ? n : 0, horror: kind === "horror" ? n : 0 } });
      return;
    }
    case "searchEncounterDraw": {
      // the encounter deck first, then its discard pile; the investigator resolving the effect draws the card
      const id = [...g.s.encounterDeck, ...g.s.encounterDiscard].find((c) => matchesFilter(g, card(g, c).code, e.filter));
      if (id) {
        moveCard(g, id, "limbo");
        emit(g, "encounter", `${invName(g, you)} finds and draws ${def(g, id).name}`, { inv: you, card: id });
        push(g, { t: "Spawn", enemy: id, inv: you });
      }
      shuffle(g.s, g.s.encounterDeck);
      emit(g, "shuffle", `${invName(g, you)} shuffles the encounter deck`, { inv: you });
      return;
    }
    case "discardEncounterUntil": {
      if (e.shuffleDiscardFirst) {
        for (const id of g.s.encounterDiscard.splice(0)) {
          g.s.cards[id].zone = "encounterDeck";
          g.s.encounterDeck.push(id);
        }
        shuffle(g.s, g.s.encounterDeck);
      }
      let want = e.count ?? 1;
      if (e.countIfPlayersAtLeast && playerCount(g) >= e.countIfPlayersAtLeast[0]) want = e.countIfPlayersAtLeast[1];
      const found: InstId[] = [];
      while (found.length < want && g.s.encounterDeck.length) {
        const id = g.s.encounterDeck[0];
        if (matchesFilter(g, card(g, id).code, e.filter)) {
          moveCard(g, id, "limbo");
          found.push(id);
        } else {
          moveCard(g, id, "encounterDiscard");
          emit(g, "discard", `${def(g, id).name} is discarded from the encounter deck`, { card: id });
        }
      }
      for (const id of found) {
        if (e.then === "leadDraws") {
          emit(g, "encounter", `${invName(g, g.s.lead)} draws ${def(g, id).name}`, { inv: g.s.lead, card: id });
          push(g, { t: "Spawn", enemy: id, inv: g.s.lead });
        } else {
          const at = e.at ? locationByName(g, e.at) ?? findByCode(g, e.at, ["location"]) : undefined;
          push(g, { t: "Spawn", enemy: id, inv: null, at: at?.id ?? null });
          if (e.doom) push(g, { t: "PlaceDoom", card: id, n: e.doom });
        }
      }
      return;
    }
    case "dropClues": {
      const me = inv(g, you);
      const n = Math.min(amt(g, e.amount, ctx), me.clues);
      if (n <= 0 || !me.location) return;
      me.clues -= n;
      card(g, me.location).clues += n;
      emit(g, "clues", `${me.name} places ${n} clue(s) on ${def(g, me.location).name}`, { inv: you, card: me.location, data: { n, placed: true, source: ctx.source ?? null } });
      return;
    }
    case "spendClues": {
      const me = inv(g, you);
      me.clues -= Math.min(amt(g, e.amount, ctx), me.clues);
      return;
    }
    case "healEnemy": {
      if (!src || src.zone !== "enemy") return;
      src.damage = Math.max(0, src.damage - e.amount);
      emit(g, "heal", `${def(g, src.id).name} heals ${e.amount} damage`, { card: src.id, data: { damage: e.amount, horror: 0 } });
      return;
    }
    case "script": {
      const code = src?.code ?? g.s.scenarioId;
      push(g, { t: "Script", code: g.db.scripts[code]?.fns?.[e.fn] ? code : g.s.scenarioId, fn: e.fn, ctx, args: e.args });
      return;
    }
  }
};

export const handlers = { Effects: effectsHandler, Eff: effHandler };
export type { Effect };
