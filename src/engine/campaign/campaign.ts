import {
  campaignNotes,
  campaignTokens,
  exiled as exiledFlag,
  killed as killedFlag,
  insane as insaneFlag,
  xp,
} from "../world/flags";
import { addCards, emptyLog, flatLog, migrateLog, NOTES, record, setCount } from "./log";
import { flowOf } from "../../content/flow";
import { basicWeaknessPool, expandDeck, validateDeck } from "./decks";
import { ENGINE_VERSION } from "../index";
import { advance, initFlow, settle, startResolution } from "./flow";
import { randInt } from "../world/rng";
import type { ContentDb, GameSetup, GameState } from "../world/types";
import { cardOf, cardsOf, invsOf, namedTokensOf, pileOf } from "../context";
import type { CampaignState, NewCampaign, ScenarioFacts } from "./types";
import { EVENT } from "../events/event";
import { isOneOf, SCENARIO_CARD, ZONE } from "../world/constants";

export function startCampaign(db: ContentDb, opts: NewCampaign): CampaignState {
  const c = db.campaigns[opts.campaignId];
  if (!c) throw new Error(`unknown campaign ${opts.campaignId}`);
  const bag = c.chaosBags[opts.difficulty];
  if (!bag) throw new Error(`${c.name} has no ${opts.difficulty} chaos bag`);
  if (opts.investigators.length < 1 || opts.investigators.length > 4)
    throw new Error("1–4 investigators");
  const rng = { rng: opts.seed >>> 0 };
  const investigators = opts.investigators.map(({ code, deckId, deck: custom }) => {
    const d = custom ?? db.decks[deckId];
    if (!d || d.investigator !== code) throw new Error(`deck ${deckId} is not a ${code} deck`);
    if (custom) {
      const problems = validateDeck(db, custom);
      if (problems.length)
        throw new Error(`invalid deck ${deckId}: ${problems.map((p) => p.message).join("; ")}`);
    }
    const deck = expandDeck(d);
    // the random basic weakness is chosen once, at campaign start
    if (d.randomBasicWeakness) {
      const pool = basicWeaknessPool(db);
      deck.push(pool[randInt(rng, pool.length)].code);
    }
    return {
      code,
      deckId,
      deck,
      xp: 0,
      physicalTrauma: 0,
      mentalTrauma: 0,
      status: "active" as const,
    };
  });
  const state: CampaignState = {
    version: ENGINE_VERSION,
    campaignId: c.id,
    difficulty: opts.difficulty,
    seed: opts.seed,
    rng: rng.rng,
    log: emptyLog(),
    chaosBag: [...bag],
    flow: initFlow(db, c.id),
    lead: investigators[0].code,
    investigators,
    history: [],
    result: null,
  };
  // only when some are chosen, so a campaign without options keeps the state it always had
  const options = (opts.options ?? []).filter((id) => c.options.some((o) => o.id === id));
  if (options.length) state.options = options;
  // the campaign's setup and its first interlude run up to the first prompt, or to the first scenario
  return advance(db, state);
}

/**
 * A campaign saved before the flow (a scenario index and a flat log) as a campaign with one: the flat log becomes the
 * notes section, and the flow stands at the scenario the index named, playing it when a game of it was in progress and
 * at its Begin prompt otherwise. A campaign that already has a flow is returned as it is.
 */
export function migrateCampaign(
  db: ContentDb,
  raw: Record<string, any>,
  inGame: boolean,
): CampaignState {
  if (raw.flow) return raw as CampaignState;
  const { scenarioIndex, log, ...rest } = raw;
  const def = db.campaigns[raw.campaignId];
  const id: string | null = def?.scenarios[scenarioIndex ?? 0] ?? null;
  const flow = initFlow(db, raw.campaignId);
  flow.queue = [];
  if (id) {
    flow.pos = Math.max(0, flowOf(db, raw.campaignId).order.indexOf(id));
    flow.play = id;
    if (inGame) flow.playing = true;
    else flow.waiting = { id: "play", step: { kind: EVENT.Play, scenario: id } };
  } else flow.pos = flowOf(db, raw.campaignId).order.length;
  return { ...rest, log: migrateLog(log ?? {}), flow } as CampaignState;
}

/** the scenario to play now (or being played); null while the flow is between, or when the campaign is over */
export const currentScenarioId = (_db: ContentDb, c: CampaignState): string | null => c.flow.play;

/** setup for the next scenario of the campaign */
export function scenarioSetup(db: ContentDb, c: CampaignState, seed: number): GameSetup {
  const scenarioId = currentScenarioId(db, c);
  if (!scenarioId) throw new Error("campaign is over");
  const active = c.investigators.filter((i) => i.status === "active");
  const ordered = [
    ...active.filter((i) => i.code === c.lead),
    ...active.filter((i) => i.code !== c.lead),
  ];
  // scenario setup steps may add tokens on top of this bag (and the campaign keeps them afterwards)
  return {
    campaignId: c.campaignId,
    scenarioId,
    difficulty: c.difficulty,
    seed,
    campaignLog: flatLog(c.log),
    chaosBag: [...c.chaosBag],
    ...(c.options?.length ? { options: [...c.options] } : {}),
    investigators: ordered.map((i) => ({
      code: i.code,
      deck: i.deck,
      physicalTrauma: i.physicalTrauma,
      mentalTrauma: i.mentalTrauma,
    })),
  };
}

/** victory display total, including clue-less revealed locations still in play */
export function victoryTotal(db: ContentDb, s: GameState): number {
  let n = 0;
  for (const c of cardsOf(s)) {
    const v = db.cards[c.code].victory;
    if (!v) continue;
    if (c.zone === "victory") n += v;
    else if (c.zone === "location" && c.revealed && c.clues === 0) n += v;
  }
  return n;
}

function uniqueCultists(db: ContentDb, s: GameState, where: "victory" | "remaining"): string[] {
  const out = new Set<string>();
  for (const c of cardsOf(s)) {
    const d = db.cards[c.code];
    if (!d.unique || !d.traits.includes("Cultist") || d.type !== "enemy") continue;
    const remaining = isOneOf(
      c.zone,
      ZONE.SideDeck,
      ZONE.Enemy,
      ZONE.SetAside,
      ZONE.EncounterDeck,
      ZONE.EncounterDiscard,
      ZONE.Limbo,
    );
    if ((where === "victory" && c.zone === "victory") || (where === "remaining" && remaining))
      out.add(c.code);
  }
  return [...out];
}

/**
 * The end of a scenario: what the engine knows (trauma and experience from play, the victory display, killed and insane
 * investigators), then the resolution's steps through the campaign flow (ADR-0011), which goes on to the next prompt,
 * the next scenario or the end of the campaign. Returns the new campaign state.
 */
/** what the flow needs of a finished scenario, kept as data once its state is gone */
export function scenarioFacts(
  db: ContentDb,
  s: GameState,
  victory = victoryTotal(db, s),
): ScenarioFacts {
  return {
    id: s.scenarioId,
    resolution: s.resolution!,
    victory,
    victoryCodes: cardsOf(s)
      .filter((x) => x.zone === "victory")
      .map((x) => x.code),
    cultistsVictory: uniqueCultists(db, s, "victory"),
    cultistsRemaining: uniqueCultists(db, s, "remaining"),
    notResigned: invsOf(s)
      .filter((i) => i.status !== "resigned")
      .map((i) => i.id),
    resigned: invsOf(s)
      .filter((i) => i.status === "resigned")
      .map((i) => i.id),
    defeated: invsOf(s)
      .filter((i) => i.status === "defeated")
      .map((i) => i.id),
    ...(db.scenarios[s.scenarioId].resolutions[s.resolution!]?.checkpoint
      ? { checkpoint: true }
      : {}),
    ...exiledIn(s),
  };
}

const CHECKPOINT = "checkpoint";
/**
 * A checkpoint writes the table into the campaign log for the next part's setup (`fromCheckpoint`): the locations in play
 * with their clues and named tokens, each investigator's story assets and named tokens, the cards beneath the scenario
 * card. What the guide's "take a break" list doesn't name is not carried.
 */
function recordCheckpoint(c: CampaignState, s: GameState) {
  const named = (holder: string) => namedTokensOf(s, holder);
  const locs = cardsOf(s).filter((x) => x.zone === "location");
  c.log = addCards(
    c.log,
    "checkpoint:locations",
    locs.map((l) => l.code),
    false,
    CHECKPOINT,
  );
  for (const l of locs) {
    c.log = setCount(c.log, `checkpoint:clues:${l.code}`, "set", l.clues, CHECKPOINT);
    for (const [name, n] of named(l.id))
      c.log = setCount(c.log, `checkpoint:tokens:${l.code}:${name}`, "set", n, CHECKPOINT);
  }
  for (const i of invsOf(s)) {
    const assets = cardsOf(s).filter((x) => x.zone === "play" && !x.owner && x.controller === i.id);
    if (assets.length)
      c.log = addCards(
        c.log,
        `checkpoint:assets:${i.id}`,
        assets.map((a) => a.code),
        false,
        CHECKPOINT,
      );
    for (const [name, n] of named(i.id))
      c.log = setCount(c.log, `checkpoint:tokens:${i.id}:${name}`, "set", n, CHECKPOINT);
  }
  const under = pileOf(s, `beneath:${SCENARIO_CARD}`).map((id) => cardOf(s, id).code);
  if (under.length) c.log = addCards(c.log, "checkpoint:beneathScenario", under, false, CHECKPOINT);
}

/** what each investigator exiled during the scenario, when anyone did */
function exiledIn(s: GameState): { exiled?: Record<string, string[]> } {
  const out = Object.fromEntries(
    invsOf(s)
      .map((i) => [i.id, exiledFlag.get({ s }, i.id) ?? []] as const)
      .filter(([, codes]) => codes.length),
  );
  return Object.keys(out).length ? { exiled: out } : {};
}

export function applyScenarioEnd(db: ContentDb, c0: CampaignState, s: GameState): CampaignState {
  if (s.phase !== "ended" || !s.resolution) throw new Error("scenario has not ended");
  const c = structuredClone(c0);
  const victory = victoryTotal(db, s);
  // trauma and adjustments that happened during play
  for (const i of invsOf(s)) {
    const ci = c.investigators.find((x) => x.code === i.id)!;
    ci.physicalTrauma += i.physicalTrauma;
    ci.mentalTrauma += i.mentalTrauma;
    ci.xp += xp.get({ s }, i.id) ?? 0;
    // killed during the scenario (Crazed Shoggoth's attack)
    if (killedFlag.get({ s }, i.id)) ci.status = "killed";
    else if (insaneFlag.get({ s }, i.id)) ci.status = "insane";
    // an exiled card leaves the campaign deck: one copy for each exile
    for (const code of exiledFlag.get({ s }, i.id) ?? []) {
      const at = ci.deck.indexOf(code);
      if (at >= 0) ci.deck.splice(at, 1);
      ci.exiled = [...(ci.exiled ?? []), code];
    }
  }
  // what the scenario's script found out and the guide asks the players (`log:<section>:<id>`, `count:<section>:<id>`, `cards:<section>:<id>`)
  for (const n of campaignNotes(s)) {
    if (n.kind === "log") c.log = record(c.log, n.id, n.section || NOTES);
    else if (n.kind === "cards")
      c.log = addCards(c.log, n.id, (n.value as string[]).map(String), false, n.section || NOTES);
    else c.log = setCount(c.log, n.id, "add", Number(n.value), n.section || NOTES);
  }
  if (db.scenarios[s.scenarioId].resolutions[s.resolution]?.checkpoint) recordCheckpoint(c, s);
  // permanent bag additions from this scenario's setup, and those made during play "for the remainder of the campaign"
  for (const st of db.scenarios[s.scenarioId].setup)
    if (st.do === "addChaosToken") c.chaosBag.push(st.token);
  c.chaosBag.push(...(campaignTokens.get({ s }) ?? []));
  c.history.push({ scenarioId: s.scenarioId, resolution: s.resolution, xp: 0, victory });
  settle(db, c);
  return startResolution(db, c, scenarioFacts(db, s, victory));
}
