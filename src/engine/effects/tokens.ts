/** Effects that put clues, doom, tokens and uses on cards, or take them off. */
import {
  addChaosTokens,
  addCounter,
  addTokens,
  ask,
  card,
  chaosBag,
  def,
  emit,
  type GameContext,
  inv,
  invName,
  push,
  randomInt,
  tokensOn,
} from "../context";
import { moveCard } from "../movement";
import {
  canPlaceClues,
  cardsIn,
  connections,
  enemies,
  invsAt,
  locations,
  matchesFilter,
  tokenHolder,
} from "../queries";
import type { InstId } from "../world/types";
import { amt, enemyTargets, opt } from "./targets";
import type { EffectOf, EffectRun } from "./types";
import { EVENT } from "../events/event";
import { ZONE, CHOICE } from "../world/constants";
import { STEP } from "../steps/step";
import { campaignTokens } from "../world/flags";

function discoverCluesEffect(game: GameContext, run: EffectRun<EffectOf<"discoverClues">>) {
  const { step, ctx, you } = run;
  const e = run.effect;

  let loc = e.at === "testLocation" ? ctx.location : inv(game, you).location;
  if (((e.at === "yourOrConnecting" || e.at === "connecting") && loc) || e.at === "anyLocation") {
    const cands = (
      e.at === "anyLocation"
        ? locations(game).map((l) => l.id)
        : e.at === "connecting"
          ? connections(game, loc!)
          : [loc!, ...connections(game, loc!)]
    ).filter((l) => card(game, l).clues > 0);
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
    push(game, { t: STEP.PlaceDoom, card: "agenda", n });
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

/** doom off this card, at most what it holds (Destroyed Path) */
function removeDoomEffect(game: GameContext, run: EffectRun<EffectOf<"removeDoom">>) {
  let src = run.ctx.source;
  // a card you control with doom on it, you choose which: your investigator or one in your play or threat area
  if (run.effect.on === "chooseYours") {
    const mine = [
      inv(game, run.you).cardId,
      ...cardsIn(game, ZONE.Play)
        .concat(cardsIn(game, ZONE.Threat))
        .filter((c) => c.controller === run.you)
        .map((c) => c.id),
    ].filter((id) => card(game, id).doom > 0);
    if (!mine.length) return;
    src = ask<InstId>(
      game,
      run.step,
      run.you,
      CHOICE.Target,
      "Choose a card to remove doom from",
      mine.map((id) => opt(game, id)),
      { auto: true, key: "removeDoomFrom" },
    );
  }
  if (!src) return;
  const n = Math.min(card(game, src).doom, amt(game, run.effect.amount, run.ctx));
  if (n <= 0) return;
  addCounter(game, src, "doom", -n);
  emit(game, EVENT.Doom, `${n} doom is removed from ${def(game, src).name}`, {
    card: src,
    data: { n: -n },
  });
}

function placeTokensEffect(game: GameContext, run: EffectRun<EffectOf<"placeTokens">>) {
  const { ctx, you, src } = run;
  const e = run.effect;

  // named tokens on this card, on you or on your location
  if (e.name) {
    const h = tokenHolder(game, e.on, ctx);
    if (h) addTokens(game, h, e.name, amt(game, e.amount ?? 1, ctx));
    return;
  }
  // clues from the bank on your location (Blood on the Altar's cultist, Strange Signs)
  if (e.on === "yourLocation") {
    const loc = tokenHolder(game, e.on, ctx);
    if (loc && e.clues !== undefined && canPlaceClues(game, loc))
      addCounter(game, loc, "clues", amt(game, e.clues, ctx));
    return;
  }
  if (!src || !canPlaceClues(game, src.id)) return;
  addCounter(game, src.id, "clues", e.clues === undefined ? 0 : amt(game, e.clues, ctx));
  addCounter(game, src.id, "horror", e.horror ?? 0);
  addCounter(game, src.id, "damage", e.damage === undefined ? 0 : amt(game, e.damage, ctx));
  addCounter(game, src.id, "doom", e.doom ?? 0);
  addCounter(game, src.id, "resources", e.resources ?? 0);
  if (e.resources) addCounter(game, you, "resources", -e.resources);
  if (e.damage !== undefined || e.horror) assetDefeatCheck(game, src.id);
  return;
}

function addUsesEffect(game: GameContext, run: EffectRun<EffectOf<"addUses">>) {
  const { step, you } = run;
  const e = run.effect;

  const here = invsAt(game, inv(game, you).location);
  const cands = cardsIn(game, ZONE.Play).filter(
    (c) =>
      c.controller &&
      here.includes(c.controller) &&
      matchesFilter(game, c.code, e.filter) &&
      (!e.usesType || e.usesType.includes(def(game, c.id).uses?.type ?? "")),
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
  addCounter(game, pick, "uses", e.double ? card(game, pick).uses : (e.amount ?? 0));
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

function removeTokensEffect(game: GameContext, run: EffectRun<EffectOf<"removeTokens">>) {
  const h = tokenHolder(game, run.effect.on, run.ctx);
  if (h) addTokens(game, h, run.effect.name, -amt(game, run.effect.amount, run.ctx));
}

/** at most what the giver holds */
function moveTokensEffect(game: GameContext, run: EffectRun<EffectOf<"moveTokens">>) {
  const { effect: e, ctx } = run;
  const from = tokenHolder(game, e.from, ctx);
  const to = tokenHolder(game, e.to, ctx);
  if (!from || !to) return;
  const n = Math.min(tokensOn(game, from, e.name), amt(game, e.amount, ctx));
  addTokens(game, from, e.name, -n);
  addTokens(game, to, e.name, n);
}

/** a random chaos token revealed outside a test, then back in the bag: the first `on` entry it matches resolves */
function revealTokenEffect(game: GameContext, run: EffectRun<EffectOf<"revealToken">>) {
  const { ctx, you } = run;
  const bag = chaosBag(game);
  if (!bag.length) return;
  const token = bag[randomInt(game, bag.length)];
  emit(game, EVENT.Token, `${invName(game, you)} reveals ${token}`, { inv: you, data: { token } });
  const n = /^[+-]?\d+$/.test(token) ? Number(token) : null;
  const hit = run.effect.on.find(
    (o) => o.tokens?.includes(token) || (n !== null && o.parity === (n % 2 === 0 ? "even" : "odd")),
  );
  if (hit) push(game, { t: STEP.Effects, effects: hit.effects, ctx: { ...ctx, token } });
}

/** an asset given damage or horror off an attack (Peter Clover): defeated when it has enough, controlled or not */
function assetDefeatCheck(game: GameContext, id: InstId) {
  const c = card(game, id);
  const d = def(game, id);
  if (d.type !== "asset") return;
  if (c.controller) {
    push(game, { t: STEP.AssetDefeatCheck, inv: c.controller });
    return;
  }
  if ((d.health && c.damage >= d.health) || (d.sanity && c.horror >= d.sanity)) {
    emit(game, EVENT.AssetDefeated, `${d.name} is defeated`, { card: id });
    moveCard(game, id, ZONE.EncounterDiscard);
  }
}

/** tokens into the chaos bag; "for the remainder of the campaign": kept for the campaign's bag too */
function addChaosTokensEffect(game: GameContext, run: EffectRun<EffectOf<"addChaosTokens">>) {
  const { tokens, forCampaign } = run.effect;
  addChaosTokens(game, tokens);
  if (forCampaign) campaignTokens.set(game, [...(campaignTokens.get(game) ?? []), ...tokens]);
  emit(game, EVENT.Place, `${tokens.join(", ")} added to the chaos bag`, {
    data: { tokens, forCampaign: !!forCampaign },
  });
}

export const tokensEffects = {
  addChaosTokens: addChaosTokensEffect,
  revealToken: revealTokenEffect,
  removeTokens: removeTokensEffect,
  moveTokens: moveTokensEffect,
  discoverClues: discoverCluesEffect,
  placeDoom: placeDoomEffect,
  removeDoom: removeDoomEffect,
  placeTokens: placeTokensEffect,
  addUses: addUsesEffect,
  checkDoom: checkDoomEffect,
  dropClues: dropCluesEffect,
  spendClues: spendCluesEffect,
  removeUses: removeUsesEffect,
};
