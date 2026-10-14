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
