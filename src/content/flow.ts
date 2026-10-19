import type { CampaignFlow, CampaignStep } from "./schema";
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
