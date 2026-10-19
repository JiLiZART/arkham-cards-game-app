import type { CardDef } from "./schema";
import type { ContentDb } from "../engine/types";

export const DEFAULT_LOCALE = "en";
export type CardText = Pick<CardDef, "name" | "text"> & Partial<Pick<CardDef, "subname" | "backName" | "backText" | "traits">>;

/** card name/text in a locale, falling back to English field by field */
export function cardText(db: ContentDb, code: string, locale: string): CardText {
  const base = db.cards[code];
  const tr = (locale !== DEFAULT_LOCALE && db.i18n[locale]?.cards[code]) || {};
  return {
    name: tr.name ?? base.name,
    text: tr.text ?? base.text,
    subname: tr.subname ?? base.subname,
    backName: tr.backName ?? base.backName,
    backText: tr.backText ?? base.backText,
    traits: tr.traits ?? base.traits,
  };
}

/** UI string lookup with English fallback, `{name}` placeholders */
export function t(db: ContentDb, locale: string, key: string, vars: Record<string, string | number> = {}): string {
  const s = db.i18n[locale]?.ui[key] ?? db.i18n[DEFAULT_LOCALE]?.ui[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

export const locales = (db: ContentDb) => Object.keys(db.i18n);

const campaignText = (db: ContentDb, locale: string) => db.i18n[locale]?.campaigns;

/** campaign name in a locale (English from the campaign file as the fallback) */
/** what a campaign's tile says before its scenarios are loaded: the guide's opening text and the scenarios' names, in the locale */
export function campaignBlurb(db: ContentDb, id: string, locale: string): { prologue: string | undefined; scenarios: string[] } {
  const tr = campaignText(db, locale)?.campaigns[id];
  const base = db.campaigns[id];
  return { prologue: tr?.prologue ?? base?.prologue, scenarios: tr?.scenarioNames ?? base?.scenarioNames ?? [] };
}

export interface StepText {
  title?: string;
  text?: string;
  choices?: Record<string, string>;
}

/** the words of a campaign flow's step in a locale, field by field over the flow's own (English) text; {} for a step with none */
export function stepText(db: ContentDb, campaignId: string, stepId: string, locale: string): StepText {
  const st = db.flows[campaignId]?.steps[stepId];
  if (!st) return {};
  const tr = campaignText(db, locale)?.campaigns[campaignId]?.steps?.[stepId];
  const own: StepText = {
    ...("title" in st && st.title ? { title: st.title } : {}),
    ...("text" in st && st.text ? { text: st.text } : {}),
    ...("choices" in st ? { choices: Object.fromEntries(st.choices.map((c) => [c.id, c.text])) } : {}),
  };
  return { ...own, ...(tr?.title ? { title: tr.title } : {}), ...(tr?.text ? { text: tr.text } : {}), ...(own.choices ? { choices: { ...own.choices, ...tr?.choices } } : {}) };
}

/** an interlude's or epilogue's name in a locale */
export const interludeName = (db: ContentDb, campaignId: string, id: string, locale: string): string | undefined =>
  campaignText(db, locale)?.campaigns[campaignId]?.interludeNames?.[id] ?? db.flows[campaignId]?.interludes[id]?.name;

export const campaignName = (db: ContentDb, id: string, locale: string) => campaignText(db, locale)?.campaigns[id]?.name ?? db.campaigns[id].name;

/** a campaign-log key as readable text */
export const logLabel = (db: ContentDb, campaignId: string, key: string, locale: string) =>
  campaignText(db, locale)?.campaigns[campaignId]?.logLabels[key] ?? db.campaigns[campaignId].logLabels[key] ?? key;

/** scenario name, intro and resolutions in a locale, field by field over the English scenario file */
export function scenarioText(db: ContentDb, id: string, locale: string) {
  const base = db.scenarios[id];
  const tr = campaignText(db, locale)?.scenarios[id];
  const resolution = (key: string) => {
    const r = base?.resolutions[key];
    return r ? { ...r, title: tr?.resolutions[key]?.title ?? r.title, text: tr?.resolutions[key]?.text ?? r.text } : undefined;
  };
  // a generated campaign's scenario not loaded yet (loadCampaign) goes by its id until it is
  return { name: tr?.name ?? base?.name ?? id, intro: tr?.intro ?? base?.intro, resolution };
}

export const encounterSetName = (db: ContentDb, code: string, locale: string) => campaignText(db, locale)?.encounterSets[code] ?? null;
