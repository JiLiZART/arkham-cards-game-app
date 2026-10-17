import type { CampaignEffect, ChaosToken, DeckDef, Difficulty } from "../content/schema";
import { expandDeck, validateDeck } from "./decks";
import { ENGINE_VERSION } from "./engine";
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
  log: Record<string, unknown>;
  chaosBag: ChaosToken[];
  scenarioIndex: number;
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
  Object.values(db.cards).filter((c) => c.subtype === "basicweakness" && c.type !== "investigator" && (!trait || c.traits.includes(trait)));

export function startCampaign(db: ContentDb, opts: NewCampaign): CampaignState {
  const c = db.campaigns[opts.campaignId];
  if (!c) throw new Error(`unknown campaign ${opts.campaignId}`);
  const bag = c.chaosBags[opts.difficulty];
  if (!bag) throw new Error(`${c.name} has no ${opts.difficulty} chaos bag`);
  if (opts.investigators.length < 1 || opts.investigators.length > 4) throw new Error("1–4 investigators");
  const rng = { rng: opts.seed >>> 0 };
  const pool = basicWeaknesses(db);
  const investigators = opts.investigators.map(({ code, deckId, deck: custom }) => {
    const d = custom ?? db.decks[deckId];
    if (!d || d.investigator !== code) throw new Error(`deck ${deckId} is not a ${code} deck`);
    if (custom) {
      const problems = validateDeck(db, custom);
      if (problems.length) throw new Error(`invalid deck ${deckId}: ${problems.map((p) => p.message).join("; ")}`);
    }
    const deck = expandDeck(d);
    // the random basic weakness is chosen once, at campaign start
    if (d.randomBasicWeakness) deck.push(pool[randInt(rng, pool.length)].code);
    return { code, deckId, deck, xp: 0, physicalTrauma: 0, mentalTrauma: 0, status: "active" as const };
  });
  return {
    version: ENGINE_VERSION, campaignId: c.id, difficulty: opts.difficulty, seed: opts.seed, rng: rng.rng,
    log: {}, chaosBag: [...bag], scenarioIndex: 0, lead: investigators[0].code,
    investigators, history: [], result: null,
  };
}

export const currentScenarioId = (db: ContentDb, c: CampaignState) => db.campaigns[c.campaignId].scenarios[c.scenarioIndex] ?? null;

/** setup for the next scenario of the campaign */
export function scenarioSetup(db: ContentDb, c: CampaignState, seed: number): GameSetup {
  const scenarioId = currentScenarioId(db, c);
  if (!scenarioId) throw new Error("campaign is over");
  const active = c.investigators.filter((i) => i.status === "active");
  const ordered = [...active.filter((i) => i.code === c.lead), ...active.filter((i) => i.code !== c.lead)];
  // scenario setup steps may add tokens on top of this bag (and the campaign keeps them afterwards)
  return {
    campaignId: c.campaignId, scenarioId, difficulty: c.difficulty, seed, campaignLog: structuredClone(c.log), chaosBag: [...c.chaosBag],
    investigators: ordered.map((i) => ({ code: i.code, deck: i.deck, physicalTrauma: i.physicalTrauma, mentalTrauma: i.mentalTrauma })),
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
    const remaining = ["sideDeck", "enemy", "setAside", "encounterDeck", "encounterDiscard", "limbo"].includes(c.zone);
    if ((where === "victory" && c.zone === "victory") || (where === "remaining" && remaining)) out.add(c.code);
  }
  return [...out];
}

/** apply the end of a scenario to the campaign; returns the new campaign state */
export function applyScenarioEnd(db: ContentDb, c0: CampaignState, s: GameState): CampaignState {
  if (s.phase !== "ended" || !s.resolution) throw new Error("scenario has not ended");
  const c = structuredClone(c0);
  const res = db.scenarios[s.scenarioId].resolutions[s.resolution] ?? db.scenarios[s.scenarioId].resolutions.none;
  const victory = victoryTotal(db, s);
  const rng = { rng: c.rng };
  const byCode = (code: InvId) => c.investigators.find((i) => i.code === code)!;
  // trauma and adjustments that happened during play
  for (const i of Object.values(s.invs)) {
    const ci = byCode(i.id);
    ci.physicalTrauma += i.physicalTrauma;
    ci.mentalTrauma += i.mentalTrauma;
    ci.xp += (s.flags[`xp:${i.id}`] as number | undefined) ?? 0;
  }
  let xpEarned = 0;
  const each = c.investigators.filter((i) => i.status === "active");
  const lead = byCode(s.lead);
  const apply = (e: CampaignEffect) => {
    switch (e.do) {
      case "record":
        c.log[e.key] = e.value;
        return;
      case "crossOut":
        delete c.log[e.key];
        return;
      case "crossOutIfInVictory":
        if (Object.values(s.cards).some((x) => x.code === e.code && x.zone === "victory")) delete c.log[e.key];
        return;
      case "recordCards":
        c.log[e.key] = uniqueCultists(db, s, e.source === "victoryUniqueCultists" ? "victory" : "remaining");
        return;
      case "xp": {
        const n = e.bonus + (e.victory ? victory : 0);
        for (const i of e.who === "lead" ? [lead] : each) i.xp += n;
        if (e.who !== "lead") xpEarned += n;
        return;
      }
      case "trauma":
        for (const i of e.who === "lead" ? [lead] : each) {
          i.physicalTrauma += e.physical;
          i.mentalTrauma += e.mental;
        }
        return;
      case "kill":
        for (const i of each) if (e.who === "each" || s.invs[i.code]?.status !== "resigned") i.status = "killed";
        return;
      case "earnCard":
        // ponytail: "choice" goes to the lead too; a picker UI can come with the deck upgrade screen
        lead.deck.push(e.code);
        return;
      case "removeCard":
        for (const i of c.investigators) i.deck = i.deck.filter((x) => x !== e.code);
        return;
      case "addWeakness": {
        const pool = basicWeaknesses(db, e.trait);
        for (const i of each) if (pool.length) i.deck.push(pool[randInt(rng, pool.length)].code);
        return;
      }
      case "addChaosToken":
        c.chaosBag.push(e.token);
        return;
      case "end":
        c.result = e.result;
        return;
    }
  };
  for (const e of res.effects) apply(e);
  // permanent bag additions from this scenario's setup
  for (const st of db.scenarios[s.scenarioId].setup) if (st.do === "addChaosToken") c.chaosBag.push(st.token);
  // killed or driven insane by trauma
  for (const i of c.investigators) {
    if (i.status !== "active") continue;
    const d = db.cards[i.code];
    if (i.physicalTrauma >= (d.health ?? Infinity)) i.status = "killed";
    else if (i.mentalTrauma >= (d.sanity ?? Infinity)) i.status = "insane";
  }
  c.history.push({ scenarioId: s.scenarioId, resolution: s.resolution, xp: xpEarned, victory });
  c.rng = rng.rng;
  c.scenarioIndex++;
  if (!c.result && c.investigators.every((i) => i.status !== "active")) c.result = "lose";
  if (!c.result && !currentScenarioId(db, c)) c.result = "win";
  if (!c.investigators.find((i) => i.code === c.lead && i.status === "active")) {
    c.lead = c.investigators.find((i) => i.status === "active")?.code ?? c.lead;
  }
  return c;
}
