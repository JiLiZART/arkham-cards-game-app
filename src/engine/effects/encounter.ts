/** Effects that draw, spawn and shuffle encounter cards and engage enemies. */
import { surge } from "../world/flags";
import {
  ask,
  card,
  def,
  emit,
  type GameContext,
  inv,
  invName,
  leadInvestigator,
  pile,
  playerCount,
  push,
  setCardLocation,
  setEngaged,
  shuffleDeck,
} from "../context";
import {
  cardsIn,
  distances,
  enemies,
  enemiesAt,
  findByCode,
  isElite,
  locationByName,
  matchesFilter,
} from "../queries";
import { moveCard, reshuffleDiscard } from "../movement";
import { win } from "../rules/cards";
import { canEnemyEnter } from "../rules/enemies";
import type { InstId } from "../world/types";
import { opt } from "./targets";
import type { EffectOf, EffectRun } from "./types";
import { EVENT } from "../events/event";
import { ZONE, CHOICE } from "../world/constants";
import { STEP } from "../steps/step";

function drawEncounterCardEffect(game: GameContext, run: EffectRun<EffectOf<"drawEncounterCard">>) {
  const { you } = run;

  push(game, { t: STEP.DrawEncounter, inv: you });
  return;
}

function disengageAllEffect(game: GameContext, run: EffectRun<EffectOf<"disengageAll">>) {
  const { you } = run;
  const e = run.effect;

  for (const en of enemies(game)) {
    if (en.engagedWith === you && !(e.nonTrait && def(game, en.id).traits.includes(e.nonTrait)))
      setEngaged(game, en.id, null);
  }
  return;
}

function surgeEffect(game: GameContext, run: EffectRun<EffectOf<"surge">>) {
  const { ctx } = run;

  if (ctx.source) surge.set(game, ctx.source, true);
  return;
}

function drawCultistOrSearchEffect(
  game: GameContext,
  run: EffectRun<EffectOf<"drawCultistOrSearch">>,
) {
  const { ctx, you } = run;

  const cultists = enemies(game).filter((x) => def(game, x.id).traits.includes("Cultist"));
  if (cultists.length) {
    push(game, { t: STEP.Eff, effect: { op: "placeDoom", amount: 2, on: "nearestCultist" }, ctx });
    return;
  }
  const pool = [...pile(game, ZONE.EncounterDeck), ...pile(game, ZONE.EncounterDiscard)].find(
    (id) => def(game, id).type === "enemy" && def(game, id).traits.includes("Cultist"),
  );
  if (pool) {
    moveCard(game, pool, ZONE.Resolving);
    shuffleDeck(game, "encounter");
    emit(game, EVENT.Encounter, `${invName(game, you)} draws ${def(game, pool).name}`, {
      inv: you,
      card: pool,
    });
    push(game, { t: STEP.Spawn, enemy: pool, inv: you });
  }
  return;
}

function spawnSetAsideEffect(game: GameContext, run: EffectRun<EffectOf<"spawnSetAside">>) {
  const e = run.effect;

  const c = findByCode(game, e.code, e.orVictory ? [ZONE.SetAside, ZONE.Victory] : [ZONE.SetAside]);
  if (!c) return;
  const at = e.at
    ? (locationByName(game, e.at) ?? findByCode(game, e.at, [ZONE.Location]))
    : undefined;
  push(game, { t: STEP.Spawn, enemy: c.id, inv: null, at: at?.id ?? null });
  return;
}

function putSetAsideIntoPlayEffect(
  game: GameContext,
  run: EffectRun<EffectOf<"putSetAsideIntoPlay">>,
) {
  const e = run.effect;

  const c = findByCode(game, e.code, [ZONE.SetAside]);
  if (!c) return;
  moveCard(game, c.id, ZONE.Location);
  emit(game, EVENT.Location, `${def(game, c.id).name} is put into play`, { card: c.id });
  return;
}

function shuffleIntoEncounterDeckEffect(
  game: GameContext,
  run: EffectRun<EffectOf<"shuffleIntoEncounterDeck">>,
) {
  const { ctx } = run;

  const id = ctx.enemy;
  if (!id) return;
  moveCard(game, id, ZONE.EncounterDeck);
  shuffleDeck(game, "encounter");
  emit(game, EVENT.Shuffle, `${def(game, id).name} is shuffled into the encounter deck`, {
    card: id,
  });
  return;
}

function searchEncounterDrawEffect(
  game: GameContext,
  run: EffectRun<EffectOf<"searchEncounterDraw">>,
) {
  const { you } = run;
  const e = run.effect;

  // the encounter deck first, then its discard pile (then the void, when the card says); the investigator resolving
  // the effect draws the card
  const where = e.zones ?? ["deck", "discard"];
  const pool = where.flatMap((z) =>
    z === "deck"
      ? pile(game, ZONE.EncounterDeck)
      : z === "discard"
        ? pile(game, ZONE.EncounterDiscard)
        : cardsIn(game, ZONE.Void).map((c) => c.id),
  );
  const id = pool.find((c) => matchesFilter(game, card(game, c).code, e.filter));
  if (id) {
    moveCard(game, id, ZONE.Limbo);
    emit(game, EVENT.Encounter, `${invName(game, you)} finds and draws ${def(game, id).name}`, {
      inv: you,
      card: id,
    });
    const at = e.at
      ? (locationByName(game, e.at) ?? findByCode(game, e.at, [ZONE.Location]))
      : undefined;
    // a treachery found (Congregational Church: Kidnapped!) is drawn and resolved, not spawned
    push(
      game,
      def(game, id).type !== "enemy"
        ? { t: STEP.DrawEncounter, inv: you, card: id }
        : at
          ? { t: STEP.Spawn, enemy: id, inv: null, at: at.id }
          : { t: STEP.Spawn, enemy: id, inv: you },
    );
  }
  shuffleDeck(game, "encounter");
  emit(game, EVENT.Shuffle, `${invName(game, you)} shuffles the encounter deck`, { inv: you });
  return;
}

function discardEncounterUntilEffect(
  game: GameContext,
  run: EffectRun<EffectOf<"discardEncounterUntil">>,
) {
  const { you } = run;
  const e = run.effect;

  if (e.shuffleDiscardFirst) {
    reshuffleDiscard(game, "encounter");
  }
  let want = e.count ?? 1;
  if (e.countIfPlayersAtLeast && playerCount(game) >= e.countIfPlayersAtLeast[0])
    want = e.countIfPlayersAtLeast[1];
  const found: InstId[] = [];
  while (found.length < want && pile(game, ZONE.EncounterDeck).length) {
    const id = pile(game, ZONE.EncounterDeck)[0];
    if (matchesFilter(game, card(game, id).code, e.filter)) {
      moveCard(game, id, ZONE.Limbo);
      found.push(id);
    } else {
      moveCard(game, id, ZONE.EncounterDiscard);
      emit(game, EVENT.Discard, `${def(game, id).name} is discarded from the encounter deck`, {
        card: id,
      });
    }
  }
  for (const id of found) {
    // a location found enters play as an encounter card does (Lost in Time and Space)
    if (def(game, id).type === "location") {
      push(game, {
        t: STEP.DrawEncounter,
        inv: e.then === "leadDraws" ? leadInvestigator(game) : you,
        card: id,
      });
      continue;
    }
    if (e.then === "leadDraws" || e.then === "youDraw") {
      const who = e.then === "youDraw" ? you : leadInvestigator(game);
      emit(game, EVENT.Encounter, `${invName(game, who)} draws ${def(game, id).name}`, {
        inv: who,
        card: id,
      });
      push(game, { t: STEP.Spawn, enemy: id, inv: who });
    } else {
      const at = e.at
        ? (locationByName(game, e.at) ?? findByCode(game, e.at, [ZONE.Location]))
        : undefined;
      push(game, { t: STEP.Spawn, enemy: id, inv: null, at: at?.id ?? null });
      if (e.doom) push(game, { t: STEP.PlaceDoom, card: id, n: e.doom });
    }
  }
  return;
}

function pullEnemyEffect(game: GameContext, run: EffectRun<EffectOf<"pullEnemy">>) {
  const { step, ctx, you } = run;
  const e = run.effect;

  const loc = inv(game, you).location;
  if (!loc) return;
  const d = distances(game, loc);
  const ids = enemies(game)
    .filter(
      (x) =>
        !!x.location &&
        (d.get(x.location) ?? Infinity) <= e.range &&
        (!e.nonElite || !isElite(game, x.id)) &&
        canEnemyEnter(game, x.id, loc),
    )
    .map((x) => x.id);
  if (!ids.length) return;
  const pick = ask<InstId>(
    game,
    step,
    you,
    CHOICE.Target,
    "Choose an enemy to pull to your location",
    ids.map((id) => opt(game, id)),
    { auto: true, key: "chooseEnemyPull" },
  );
  if (pick === undefined) return;
  const en = card(game, pick);
  setCardLocation(game, en.id, loc);
  setEngaged(game, en.id, you);
  emit(
    game,
    EVENT.Engage,
    `${def(game, pick).name} is pulled to ${invName(game, you)} and engages them`,
    {
      inv: you,
      card: pick,
    },
  );
  push(game, win("enemyEngages", { inv: you, enemy: pick }), {
    t: STEP.Effects,
    effects: e.then,
    ctx: { ...ctx, enemy: pick },
  });
  return;
}

function engageAnyEffect(game: GameContext, run: EffectRun<EffectOf<"engageAny">>) {
  const { step, ctx, you } = run;
  const e = run.effect;

  const done = e.done ?? [];
  const ids = enemiesAt(game, inv(game, you).location)
    .filter((x) => x.engagedWith !== you && !done.includes(x.id))
    .map((x) => x.id);
  if (!ids.length) return;
  const pick = ask<string>(
    game,
    step,
    you,
    CHOICE.Target,
    "Choose an enemy to engage",
    [...ids.map((id) => opt(game, id)), { id: "done", label: "Done", value: "done" }],
    { key: "chooseEnemyEngage" },
  );
  if (pick === undefined || pick === "done") return;
  setEngaged(game, pick, you);
  emit(game, EVENT.Engage, `${invName(game, you)} engages ${def(game, pick).name}`, {
    inv: you,
    card: pick,
    data: { byInv: true },
  });
  push(
    game,
    win("enemyEngages", { inv: you, enemy: pick }),
    { t: STEP.Effects, effects: e.each, ctx: { ...ctx, enemy: pick } },
    { ...step, choice: undefined, effect: { ...e, done: [...done, pick] } },
  );
  return;
}

export const encounterEffects = {
  drawEncounterCard: drawEncounterCardEffect,
  disengageAll: disengageAllEffect,
  surge: surgeEffect,
  drawCultistOrSearch: drawCultistOrSearchEffect,
  spawnSetAside: spawnSetAsideEffect,
  putSetAsideIntoPlay: putSetAsideIntoPlayEffect,
  shuffleIntoEncounterDeck: shuffleIntoEncounterDeckEffect,
  searchEncounterDraw: searchEncounterDrawEffect,
  discardEncounterUntil: discardEncounterUntilEffect,
  pullEnemy: pullEnemyEffect,
  engageAny: engageAnyEffect,
};
