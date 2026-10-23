import type { ChaosToken, DeckDef, Difficulty } from "../content/schema";
import {
  type CampaignLog,
  emptyLog,
  flatLog,
  migrateLog,
  NOTES,
  record,
  setCount,
} from "./campaignLog";
import { flowOf } from "../content/flow";
import { expandDeck, validateDeck } from "./decks";
import { ENGINE_VERSION } from "./engine";
import { advance, type FlowState, initFlow, settle, startResolution } from "./flow";
import { randInt } from "./rng";
import type { ContentDb, GameSetup, GameState, InvId } from "./types";

export interface CampaignInvestigator {
  code: InvId;
  deckId: string;
  /** full deck as card codes, including signatures and the chosen basic weakness */
  deck: string[];
  xp: number;
  physicalTrauma: number;
  mentalTrauma: number;
  status: "active" | "killed" | "insane";
}

export interface ScenarioRecord {
  scenarioId: string;
  resolution: string;
  xp: number;
  victory: number;
}

export interface CampaignState {
  version: number;
  campaignId: string;
  difficulty: Difficulty;
  seed: number;
  rng: number;
  /** the campaign log, in sections (campaignLog.ts) */
  log: CampaignLog;
  chaosBag: ChaosToken[];
  /** where the campaign's flow stands: what it is waiting for, what comes next (flow.ts, ADR-0011) */
  flow: FlowState;
  lead: InvId;
  investigators: CampaignInvestigator[];
  history: ScenarioRecord[];
  result: "win" | "lose" | "survived" | null;
}

export interface NewCampaign {
  campaignId: string;
  difficulty: Difficulty;
  seed: number;
  /** `deck` is a custom deck (saved on the device) used as given instead of the content's deck `deckId` */
  investigators: { code: InvId; deckId: string; deck?: DeckDef }[];
}

const basicWeaknesses = (db: ContentDb, trait?: string) =>
  Object.values(db.cards).filter(
    (c) =>
      c.subtype === "basicweakness" &&
      c.type !== "investigator" &&
      (!trait || c.traits.includes(trait)),
  );

export function startCampaign(db: ContentDb, opts: NewCampaign): CampaignState {
  const c = db.campaigns[opts.campaignId];
  if (!c) throw new Error(`unknown campaign ${opts.campaignId}`);
  const bag = c.chaosBags[opts.difficulty];
  if (!bag) throw new Error(`${c.name} has no ${opts.difficulty} chaos bag`);
  if (opts.investigators.length < 1 || opts.investigators.length > 4)
    throw new Error("1–4 investigators");
  const rng = { rng: opts.seed >>> 0 };
  const pool = basicWeaknesses(db);
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
    if (d.randomBasicWeakness) deck.push(pool[randInt(rng, pool.length)].code);
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
    else flow.waiting = { id: "play", step: { kind: "play", scenario: id } };
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
  for (const c of Object.values(s.cards)) {
    const v = db.cards[c.code].victory;
    if (!v) continue;
    if (c.zone === "victory") n += v;
    else if (c.zone === "location" && c.revealed && c.clues === 0) n += v;
  }
  return n;
}

function uniqueCultists(db: ContentDb, s: GameState, where: "victory" | "remaining"): string[] {
  const out = new Set<string>();
  for (const c of Object.values(s.cards)) {
    const d = db.cards[c.code];
    if (!d.unique || !d.traits.includes("Cultist") || d.type !== "enemy") continue;
    const remaining = [
      "sideDeck",
      "enemy",
      "setAside",
      "encounterDeck",
      "encounterDiscard",
      "limbo",
    ].includes(c.zone);
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
export function applyScenarioEnd(db: ContentDb, c0: CampaignState, s: GameState): CampaignState {
  if (s.phase !== "ended" || !s.resolution) throw new Error("scenario has not ended");
  const c = structuredClone(c0);
  const victory = victoryTotal(db, s);
  // trauma and adjustments that happened during play
  for (const i of Object.values(s.invs)) {
    const ci = c.investigators.find((x) => x.code === i.id)!;
    ci.physicalTrauma += i.physicalTrauma;
    ci.mentalTrauma += i.mentalTrauma;
    ci.xp += (s.flags[`xp:${i.id}`] as number | undefined) ?? 0;
  }
  // what the scenario's script found out and the guide asks the players (`log:<section>:<id>`, `count:<section>:<id>`)
  for (const [k, v] of Object.entries(s.flags)) {
    const m = /^(log|count):([^:]*):(.+)$/.exec(k);
    if (!m || v === undefined || v === false) continue;
    if (m[1] === "log") c.log = record(c.log, m[3], m[2] || NOTES);
    else c.log = setCount(c.log, m[3], "add", Number(v), m[2] || NOTES);
  }
  // permanent bag additions from this scenario's setup
  for (const st of db.scenarios[s.scenarioId].setup)
    if (st.do === "addChaosToken") c.chaosBag.push(st.token);
  c.history.push({ scenarioId: s.scenarioId, resolution: s.resolution, xp: 0, victory });
  settle(db, c);
  return startResolution(db, c, {
    id: s.scenarioId,
    resolution: s.resolution,
    victory,
    victoryCodes: Object.values(s.cards)
      .filter((x) => x.zone === "victory")
      .map((x) => x.code),
    cultistsVictory: uniqueCultists(db, s, "victory"),
    cultistsRemaining: uniqueCultists(db, s, "remaining"),
    notResigned: Object.values(s.invs)
      .filter((i) => i.status !== "resigned")
      .map((i) => i.id),
  });
}
