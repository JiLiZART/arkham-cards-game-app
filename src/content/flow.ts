import type { CampaignFlow, CampaignStep, FlowEffect } from "./schema";
import type { ContentDb } from "../engine/types";

/**
 * A campaign's flow (ADR-0011): its own `flow.json`, or, for a campaign that has none, its scenarios one after the
 * other with nothing between them (a resolution then runs the scenario file's own effects).
 */
export function flowOf(db: ContentDb, campaignId: string): CampaignFlow {
  const c = db.campaigns[campaignId];
  if (!c) throw new Error(`unknown campaign ${campaignId}`);
  return db.flows[campaignId] ?? { setup: [], order: [...c.scenarios], interludes: {}, resolutions: {}, steps: {} };
}

/**
 * The steps that follow a scenario's resolution: the flow's own list for it, or the scenario file's `effects` as one
 * step (`res:<scenario>:<resolution>`), so the interpreter sees one shape. A resolution the scenario doesn't have is
 * "none". `steps` holds every step the ids may name (the flow's, plus the made one).
 */
export function resolutionSteps(db: ContentDb, campaignId: string, scenarioId: string, resolution: string): { ids: string[]; steps: Record<string, CampaignStep> } {
  const flow = flowOf(db, campaignId);
  const sc = db.scenarios[scenarioId];
  if (!sc) throw new Error(`unknown scenario ${scenarioId}`);
  const id = sc.resolutions[resolution] ? resolution : "none";
  const own = flow.resolutions[scenarioId]?.[id];
  if (own) return { ids: own, steps: flow.steps };
  const key = `res:${scenarioId}:${id}`;
  return { ids: [key], steps: { ...flow.steps, [key]: { kind: "effects", effects: sc.resolutions[id].effects } } };
}

/** the effects a step applies itself (not those of the steps it leads to) */
export function stepEffects(st: CampaignStep): FlowEffect[] {
  return st.kind === "effects" ? st.effects : st.kind === "chooseOne" || st.kind === "checklist" ? st.choices.flatMap((c) => c.effects) : "effects" in st ? st.effects : [];
}

/** the scenarios some step sends play to (a next or replayed scenario, a side scenario on offer) */
export function namedScenarios(flow: CampaignFlow): Set<string> {
  const named = new Set<string>();
  for (const st of Object.values(flow.steps)) {
    for (const e of stepEffects(st)) if (e.do === "nextScenario" || e.do === "replayScenario") named.add(e.scenario);
    if (st.kind === "sideScenario") for (const x of st.scenarios) named.add(x.scenario);
  }
  return named;
}
