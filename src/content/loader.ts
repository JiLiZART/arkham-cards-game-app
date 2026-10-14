import type { ZodError } from "zod";
import type { CardScript, ContentDb } from "../engine/types";
import {
  CampaignDef, CardDef, CardOverride, DeckDef, Effect, I18nCards, I18nUi, InvestigatorDef, ScenarioDef, type Ability,
} from "./schema";

export interface ContentError {
  file: string;
  path: string;
  message: string;
}

const zerr = (file: string, e: ZodError, prefix = ""): ContentError[] =>
  e.issues.map((i) => ({ file, path: [prefix, ...i.path].filter((x) => x !== "").join("."), message: i.message }));

/**
 * Build the content database from raw files.
 * `files`: path (relative to repo root, e.g. "/content/packs/core/cards.json") -> parsed JSON
 * `scripts`: path -> module default export
 */
export function buildContent(files: Record<string, unknown>, scriptFiles: Record<string, CardScript>): { db: ContentDb; errors: ContentError[] } {
  const errors: ContentError[] = [];
  const db: ContentDb = { cards: {}, investigators: {}, decks: {}, scenarios: {}, campaigns: {}, scripts: {}, encounterSets: {}, i18n: {} };
  const cardFile: Record<string, string> = {};
  const entries = Object.entries(files).sort(([a], [b]) => a.localeCompare(b));

  // cards: generated + overrides per pack
  const generated = entries.filter(([p]) => /\/packs\/[^/]+\/cards\.generated\.json$/.test(p));
  for (const [file, raw] of generated) {
    const overridesPath = file.replace("cards.generated.json", "cards.json");
    const overrides = (files[overridesPath] ?? {}) as Record<string, unknown>;
    for (const [code, o] of Object.entries(overrides)) {
      const r = CardOverride.safeParse(o);
      if (!r.success) errors.push(...zerr(overridesPath, r.error, code));
    }
    for (const base of raw as { code: string }[]) {
      const merged = { ...base, ...((overrides[base.code] as object) ?? {}) };
      const r = CardDef.safeParse(merged);
      if (!r.success) {
        errors.push(...zerr(overrides[base.code] ? overridesPath : file, r.error, base.code));
        continue;
      }
      db.cards[r.data.code] = r.data;
      cardFile[r.data.code] = overrides[base.code] ? overridesPath : file;
    }
    for (const code of Object.keys(overrides)) {
      if (!(raw as { code: string }[]).some((c) => c.code === code)) errors.push({ file: overridesPath, path: code, message: `override for unknown card ${code}` });
    }
  }
  for (const c of Object.values(db.cards)) if (c.encounterSet) (db.encounterSets[c.encounterSet] ??= []).push(c.code);

  const parseInto = <T,>(re: RegExp, schema: { safeParse(v: unknown): { success: true; data: T } | { success: false; error: ZodError } }, put: (v: T, file: string) => void) => {
    for (const [file, raw] of entries) {
      if (!re.test(file)) continue;
      const r = schema.safeParse(raw);
      if (r.success) put(r.data, file);
      else errors.push(...zerr(file, r.error));
    }
  };
  parseInto(/\/investigators\/[^/]+\.json$/, InvestigatorDef, (v) => (db.investigators[v.code] = v));
  parseInto(/\/decks\/[^/]+\.json$/, DeckDef, (v) => (db.decks[v.id] = v));
  parseInto(/\/campaigns\/[^/]+\/campaign\.json$/, CampaignDef, (v) => (db.campaigns[v.id] = v));
  parseInto(/\/campaigns\/[^/]+\/scenarios\/[^/]+\.json$/, ScenarioDef, (v) => (db.scenarios[v.id] = v));
  for (const [file, raw] of entries) {
    const m = file.match(/\/i18n\/([^/]+)\/(cards|ui)\.json$/);
    if (!m) continue;
    const loc = (db.i18n[m[1]] ??= { cards: {}, ui: {} });
    const r = (m[2] === "cards" ? I18nCards : I18nUi).safeParse(raw);
    if (!r.success) errors.push(...zerr(file, r.error));
    else if (m[2] === "cards") loc.cards = r.data as Record<string, unknown>;
    else loc.ui = r.data as Record<string, string>;
  }
  for (const [file, mod] of Object.entries(scriptFiles)) {
    const key = file.split("/").pop()!.replace(/\.ts$/, "");
    db.scripts[key] = mod;
  }
  errors.push(...validateRefs(db, cardFile));
  return { db, errors };
}

/** dangling references between content files */
export function validateRefs(db: ContentDb, cardFile: Record<string, string> = {}): ContentError[] {
  const errors: ContentError[] = [];
  const has = (code: string) => !!db.cards[code];
  const need = (file: string, path: string, code: string, what = "card") => {
    if (!has(code)) errors.push({ file, path, message: `missing ${what} ${code}` });
  };
  const fnExists = (code: string, fn: string, scenarioIds: string[]) =>
    !!db.scripts[code]?.fns?.[fn] || scenarioIds.some((s) => db.scripts[s]?.fns?.[fn]);
  const scenarioIds = Object.keys(db.scenarios);
  const checkEffects = (file: string, path: string, code: string, effects: Effect[] | undefined) => {
    for (const [k, e] of (effects ?? []).entries()) {
      const p = `${path}.effects.${k}`;
      if (e.op === "script" && !fnExists(code, e.fn, scenarioIds)) errors.push({ file, path: p, message: `missing script function ${e.fn}` });
      if (e.op === "chooseOne") e.options.forEach((o, j) => checkEffects(file, `${p}.options.${j}`, code, o.effects));
      if ("onSuccess" in e) checkEffects(file, `${p}.onSuccess`, code, e.onSuccess);
      if ("onFail" in e) checkEffects(file, `${p}.onFail`, code, e.onFail);
      if ("perPointFailed" in e) checkEffects(file, `${p}.perPointFailed`, code, e.perPointFailed);
      if (e.op === "spawnSetAside" || e.op === "putSetAsideIntoPlay") need(file, p, e.code);
    }
  };
  for (const c of Object.values(db.cards)) {
    const file = cardFile[c.code] ?? "cards";
    if (c.script && !db.scripts[c.code]) errors.push({ file, path: c.code, message: `card ${c.code} declares script but content/**/scripts/${c.code}.ts is missing` });
    const abilities: (Ability & { run?: string })[] = [...c.abilities, ...(db.scripts[c.code]?.abilities ?? [])];
    abilities.forEach((a, k) => {
      if (a.run && !db.scripts[c.code]?.fns?.[a.run]) errors.push({ file, path: `${c.code}.abilities.${k}`, message: `missing script function ${a.run}` });
      checkEffects(file, `${c.code}.abilities.${k}`, c.code, a.effects);
    });
  }
  for (const inv of Object.values(db.investigators)) {
    const file = `investigators/${inv.code}.json`;
    need(file, "code", inv.code);
    inv.signatures.forEach((s, k) => need(file, `signatures.${k}`, s));
    inv.weaknesses.forEach((s, k) => need(file, `weaknesses.${k}`, s));
  }
  for (const d of Object.values(db.decks)) {
    const file = `decks/${d.id}.json`;
    need(file, "investigator", d.investigator, "investigator");
    if (!db.investigators[d.investigator]) errors.push({ file, path: "investigator", message: `missing investigator definition ${d.investigator}` });
    for (const code of Object.keys(d.cards)) need(file, `cards.${code}`, code);
  }
  for (const s of Object.values(db.scenarios)) {
    const file = `scenarios/${s.id}.json`;
    need(file, "card", s.card);
    s.acts.forEach((c, k) => need(file, `acts.${k}`, c));
    s.agendas.forEach((c, k) => need(file, `agendas.${k}`, c));
    for (const set of [...s.encounterSets, ...(s.randomEncounterSet ?? []), ...Object.values(s.sideDecks).flat()]) {
      if (!db.encounterSets[set]) errors.push({ file, path: "encounterSets", message: `missing encounter set ${set}` });
    }
    s.connections.forEach(([a, b], k) => {
      need(file, `connections.${k}`, a, "location");
      need(file, `connections.${k}`, b, "location");
    });
    s.setup.forEach((st, k) => {
      if ("codes" in st) st.codes.forEach((c) => need(file, `setup.${k}`, c));
      if ("from" in st) st.from.forEach((c) => need(file, `setup.${k}`, c));
      if (st.do === "script" && !db.scripts[s.id]?.fns?.[st.fn]) errors.push({ file, path: `setup.${k}`, message: `missing script function ${st.fn}` });
    });
    for (const [diff, toks] of Object.entries(s.tokens)) for (const [tok, te] of Object.entries(toks)) {
      checkEffects(file, `tokens.${diff}.${tok}.onReveal`, s.id, te.onReveal);
      checkEffects(file, `tokens.${diff}.${tok}.onFail`, s.id, te.onFail);
    }
    if (!s.resolutions.none) errors.push({ file, path: "resolutions", message: `scenario needs a "none" resolution` });
  }
  for (const c of Object.values(db.campaigns)) {
    c.scenarios.forEach((id, k) => {
      if (!db.scenarios[id]) errors.push({ file: `campaigns/${c.id}/campaign.json`, path: `scenarios.${k}`, message: `missing scenario ${id}` });
    });
  }
  return errors;
}
