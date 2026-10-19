import { logLabel, stepText } from "../../content/i18n";
import type { FlowChoice } from "../../content/schema";
import type { CampaignState } from "../../engine/campaign";
import { type CampaignLog, NOTES } from "../../engine/campaignLog";
import { test } from "../../engine/flow";
import type { ContentDb } from "../../engine/types";

/** the guide writes log entries as sentence fragments ("the investigators rescued…"); shown as sentences */
const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export type ReadItem = { kind: "story"; title?: string; text?: string } | { kind: "recorded"; label: string };

/** what the campaign screen reads out above the prompt: the stories since the last answer, then the log entries just recorded */
export function readItems(db: ContentDb, c: CampaignState, locale: string): ReadItem[] {
  return c.flow.shown.map((s): ReadItem => {
    if ("story" in s) {
      const { title, text } = stepText(db, c.campaignId, s.story, locale);
      return { kind: "story", ...(title ? { title } : {}), ...(text ? { text } : {}) };
    }
    return { kind: "recorded", label: sentence(logLabel(db, c.campaignId, s.recorded.id, locale)) };
  });
}

/** the choices whose own test passes */
export const visibleChoices = (db: ContentDb, c: CampaignState, choices: FlowChoice[]): FlowChoice[] => choices.filter((x) => !x.when || test(db, c, x.when));

export interface LogViewSection {
  id: string;
  label: string;
  entries: { id: string; label: string; crossedOut: boolean }[];
  counts: { id: string; n: number }[];
  cards: { id: string; codes: string[] }[];
  investigators: { id: string; byInvestigator: { code: string; n: number }[] }[];
}

const HIDDEN = "hidden";

/** the campaign log as the screen shows it: the declared sections in order (the notes first), then any other the log holds, hidden and empty ones left out */
export function logView(db: ContentDb, c: CampaignState, locale: string): LogViewSection[] {
  const declared = db.campaigns[c.campaignId]?.logSections ?? [];
  const order = [NOTES, ...declared.map((s) => s.id), ...Object.keys(c.log)].filter((id, k, all) => all.indexOf(id) === k && id !== HIDDEN);
  const label = (id: string) => declared.find((s) => s.id === id)?.label ?? id;
  return order.flatMap((id) => {
    const s = (c.log as CampaignLog)[id];
    if (!s) return [];
    const view: LogViewSection = {
      id,
      label: label(id),
      entries: s.entries.map((e) => ({ id: e.id, label: sentence(logLabel(db, c.campaignId, e.id, locale)), crossedOut: !!e.crossedOut })),
      counts: Object.entries(s.counts).map(([k, n]) => ({ id: k, n })),
      cards: Object.entries(s.cards).filter(([, codes]) => codes.length).map(([k, codes]) => ({ id: k, codes })),
      investigators: Object.entries(s.investigators).map(([k, by]) => ({ id: k, byInvestigator: Object.entries(by).map(([code, n]) => ({ code, n })) })),
    };
    return view.entries.length || view.counts.length || view.cards.length || view.investigators.length ? [view] : [];
  });
}
