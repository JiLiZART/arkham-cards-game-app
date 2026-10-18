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
