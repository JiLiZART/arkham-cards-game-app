import type { ContentDb } from "../engine/types";
import { namedScenarios } from "./flow";
import type { ContentError } from "./loader";
import { type CampaignFlow, type FlowCondition, type FlowEffect, stepRefs } from "./schema";

/** the sections every campaign has without declaring them */
const OPEN_SECTIONS = new Set(["campaign_notes", "hidden"]);

/** codes an effect or test names (a "$input" is the card the players picked) */
function conditionParts(c: FlowCondition): FlowCondition[] {
  return c.kind === "not"
    ? [c, ...conditionParts(c.condition)]
    : c.kind === "all" || c.kind === "any"
      ? [c, ...c.conditions.flatMap(conditionParts)]
      : [c];
}

function effectCodes(e: FlowEffect): string[] {
  switch (e.do) {
    case "earnCard":
    case "removeCard":
      return [e.code];
    case "listCards":
      return e.codes;
    case "replaceCard":
      return [e.old, e.new];
    default:
      return [];
  }
}

/**
 * A campaign's flow, checked against the content (ADR-0011): every step reached from the setup, an interlude or a
 * resolution; the order names the campaign's scenarios and the flow's interludes, all of them; every scenario a step
 * sends play to exists; every log section a test or effect names is declared; every card exists.
 */
export function checkFlow(db: ContentDb, campaignId: string): ContentError[] {
  const file = `campaigns/${campaignId}/flow.json`;
  const c = db.campaigns[campaignId];
  const flow: CampaignFlow | undefined = db.flows[campaignId];
  if (!c || !flow) return [];
  const errors: ContentError[] = [];
  const err = (path: string, message: string) => errors.push({ file, path, message });

  // reached: setup, interludes, resolutions, and everything those lead to
  const reached = new Set<string>();
  const visit = (ids: string[]) => {
    for (const id of ids) {
      if (reached.has(id) || !flow.steps[id]) continue;
      reached.add(id);
      visit(stepRefs(flow.steps[id]));
    }
  };
  visit(flow.setup);
  for (const i of Object.values(flow.interludes)) visit(i.steps);
  for (const byRes of Object.values(flow.resolutions))
    for (const ids of Object.values(byRes)) visit(ids);
  for (const id of Object.keys(flow.steps))
    if (!reached.has(id)) err(`steps.${id}`, "unreachable step: nothing leads to it");

  // the order of play
  const known = new Set([...c.scenarios, ...Object.keys(flow.interludes)]);
  flow.order.forEach((id, n) => {
    if (!known.has(id))
      err(`order.${n}`, `${id} is neither a scenario of the campaign nor an interlude of the flow`);
  });
  // a scenario outside the guide's order is played when a step names it; one nothing names is never played
  const named = namedScenarios(flow);
  for (const id of c.scenarios)
    if (!flow.order.includes(id) && !named.has(id))
      err("order", `scenario ${id} is not in the order and no step sends play to it`);
  for (const sc of Object.keys(flow.resolutions)) {
    if (!c.scenarios.includes(sc))
      err(`resolutions.${sc}`, `${sc} is not a scenario of the campaign`);
    else if (db.scenarios[sc])
      for (const r of Object.keys(flow.resolutions[sc]))
        if (!db.scenarios[sc].resolutions[r])
          err(`resolutions.${sc}.${r}`, `scenario ${sc} has no resolution ${r}`);
  }

  // what each step names
  const sections = new Set([...OPEN_SECTIONS, ...c.logSections.map((s) => s.id)]);
  const scenario = (path: string, id: string) => {
    if (!known.has(id))
      err(path, `${id} is neither a scenario of the campaign nor an interlude of the flow`);
  };
  const section = (path: string, s: string | undefined) => {
    if (s !== undefined && !sections.has(s))
      err(path, `log section ${s} is not defined by the campaign`);
  };
  const card = (path: string, code: string) => {
    if (code !== "$input" && !db.cards[code]) err(path, `unknown card ${code}`);
  };
  const effects = (path: string, list: FlowEffect[]) =>
    list.forEach((e, n) => {
      const p = `${path}.${n}`;
      if ("section" in e) section(p, e.section);
      if (e.do === "nextScenario" || e.do === "skipScenario" || e.do === "replayScenario")
        scenario(p, e.scenario);
      for (const code of effectCodes(e)) card(p, code);
    });
  const condition = (path: string, cond: FlowCondition) => {
    for (const x of conditionParts(cond)) {
      if ("section" in x) section(path, x.section);
      if (x.kind === "scenarioCompleted") scenario(path, x.scenario);
      if (x.kind === "hasCard") card(path, x.card);
      if (x.kind === "logCards" && x.card) card(path, x.card);
    }
  };
  for (const [id, st] of Object.entries(flow.steps)) {
    const p = `steps.${id}`;
    switch (st.kind) {
      case "effects":
        effects(p, st.effects);
        break;
      case "branch":
        condition(p, st.condition);
        break;
      case "chooseOne":
      case "checklist":
        st.choices.forEach((ch, n) => {
          effects(`${p}.choices.${n}`, ch.effects);
          if (ch.when) condition(`${p}.choices.${n}`, ch.when);
        });
        break;
      case "counter":
      case "investigatorChoice":
      case "unsupported":
        effects(p, st.effects);
        break;
      case "cardChoice":
        effects(p, st.effects);
        st.codes.forEach((code) => card(p, code));
        break;
      case "sideScenario":
        st.scenarios.forEach((s) => scenario(p, s.scenario));
        break;
    }
  }
  return errors;
}

/** every campaign's flow */
export const checkFlows = (db: ContentDb): ContentError[] =>
  Object.keys(db.flows).flatMap((id) => checkFlow(db, id));
