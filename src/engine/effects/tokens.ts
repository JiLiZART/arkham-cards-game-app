/** Effects that put clues, doom, tokens and uses on cards, or take them off. */
import {
  addCounter,
  ask,
  card,
  currentAgenda,
  def,
  emit,
  type GameContext,
  inv,
  push,
} from "../context";
import { cardsIn, connections, enemies, invsAt, matchesFilter } from "../queries";
import type { InstId } from "../world/types";
import { amt, enemyTargets, opt } from "./targets";
import type { EffectOf, EffectRun } from "./types";
import { EVENT } from "../events/event";
import { ZONE, CHOICE } from "../world/constants";
import { STEP } from "../steps/step";

function discoverCluesEffect(game: GameContext, run: EffectRun<EffectOf<"discoverClues">>) {
  const { step, ctx, you } = run;
  const e = run.effect;

  let loc = e.at === "testLocation" ? ctx.location : inv(game, you).location;
  if (e.at === "yourOrConnecting" && loc) {
    const here = loc;
    const cands = [here, ...connections(game, here)].filter((l) => card(game, l).clues > 0);
    if (!cands.length) return;
    const pick = ask<InstId>(
      game,
      step,
      you,
      CHOICE.Target,
      "Choose a location to discover a clue at",
      cands.map((l) => opt(game, l)),
      { auto: true, key: "chooseClueLocation" },
    );
    if (pick === undefined) return;
    loc = pick;
  }
  if (loc)
    push(game, { t: STEP.DiscoverClues, inv: you, location: loc, n: amt(game, e.amount, ctx) });
  return;
}

function placeDoomEffect(game: GameContext, run: EffectRun<EffectOf<"placeDoom">>) {
  const { step, ctx } = run;
  const e = run.effect;

  const n = amt(game, e.amount, ctx);
  if (e.on === "agenda") {
    const agenda = currentAgenda(game);
    if (agenda) push(game, { t: STEP.PlaceDoom, card: agenda, n });
  } else if (e.on === "self") {
    if (ctx.source) push(game, { t: STEP.PlaceDoom, card: ctx.source, n });
  } else if (e.on === "eachCultist") {
    for (const c of enemies(game).filter((x) => def(game, x.id).traits.includes("Cultist")))
      push(game, { t: STEP.PlaceDoom, card: c.id, n });
  } else {
    const ts = enemyTargets(game, step, e.on, ctx);
    if (!ts) return;
    for (const id of ts) push(game, { t: STEP.PlaceDoom, card: id, n });
  }
  return;
}

function placeTokensEffect(game: GameContext, run: EffectRun<EffectOf<"placeTokens">>) {
  const { ctx, you, src } = run;
  const e = run.effect;

  if (!src) return;
  addCounter(game, src.id, "clues", e.clues ?? 0);
  addCounter(game, src.id, "horror", e.horror ?? 0);
  addCounter(game, src.id, "damage", e.damage === undefined ? 0 : amt(game, e.damage, ctx));
  addCounter(game, src.id, "doom", e.doom ?? 0);
  addCounter(game, src.id, "resources", e.resources ?? 0);
  if (e.resources) addCounter(game, you, "resources", -e.resources);
  return;
}

function addUsesEffect(game: GameContext, run: EffectRun<EffectOf<"addUses">>) {
  const { step, you } = run;
  const e = run.effect;

  const here = invsAt(game, inv(game, you).location);
  const cands = cardsIn(game, ZONE.Play).filter(
    (c) => c.controller && here.includes(c.controller) && matchesFilter(game, c.code, e.filter),
  );
  if (!cands.length) return;
  const pick = ask<InstId>(
    game,
    step,
    you,
    CHOICE.Target,
    "Choose an asset",
    cands.map((c) => opt(game, c.id)),
    { auto: true, key: "chooseAsset" },
  );
  if (pick === undefined) return;
  addCounter(game, pick, "uses", e.amount);
  return;
}

function checkDoomEffect(game: GameContext) {
  push(game, { t: STEP.CheckDoom });
  return;
}

function dropCluesEffect(game: GameContext, run: EffectRun<EffectOf<"dropClues">>) {
  const { ctx, you } = run;
  const e = run.effect;

  const me = inv(game, you);
  const n = Math.min(amt(game, e.amount, ctx), me.clues);
  if (n <= 0 || !me.location) return;
  addCounter(game, me.id, "clues", -n);
  addCounter(game, me.location, "clues", n);
  emit(game, EVENT.Clues, `${me.name} places ${n} clue(s) on ${def(game, me.location).name}`, {
    inv: you,
    card: me.location,
    data: { n, placed: true, source: ctx.source ?? null },
  });
  return;
}

function spendCluesEffect(game: GameContext, run: EffectRun<EffectOf<"spendClues">>) {
  const { ctx, you } = run;
  const e = run.effect;

  const me = inv(game, you);
  addCounter(game, me.id, "clues", -Math.min(amt(game, e.amount, ctx), me.clues));
  return;
}

function removeUsesEffect(game: GameContext, run: EffectRun<EffectOf<"removeUses">>) {
  const { ctx, src } = run;
  const e = run.effect;

  if (src && src.uses >= e.amount) {
    addCounter(game, src.id, "uses", -e.amount);
    emit(game, EVENT.Uses, `${def(game, src.id).name} loses ${e.amount} use(s)`, { card: src.id });
  } else if (e.orElse) push(game, { t: STEP.Effects, effects: e.orElse, ctx });
  return;
}

export const tokensEffects = {
  discoverClues: discoverCluesEffect,
  placeDoom: placeDoomEffect,
  placeTokens: placeTokensEffect,
  addUses: addUsesEffect,
  checkDoom: checkDoomEffect,
  dropClues: dropCluesEffect,
  spendClues: spendCluesEffect,
  removeUses: removeUsesEffect,
};
