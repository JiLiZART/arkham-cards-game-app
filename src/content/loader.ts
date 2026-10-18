import type { ZodError } from "zod";
import type { CardScript, ContentDb } from "../engine/types";
import {
  CampaignDef, CardDef, CardOverride, DeckDef, Effect, EMPTY_SOUNDS, I18nCampaigns, I18nCards, I18nUi, InvestigatorDef, ScenarioDef, SoundManifest, type Ability,
} from "./schema";

export interface ContentError {
  file: string;
  path: string;
  message: string;
}

const zerr = (file: string, e: ZodError, prefix = ""): ContentError[] =>
  e.issues.map((i) => ({ file, path: [prefix, ...i.path].filter((x) => x !== "").join("."), message: i.message }));

/** a pack's cards (empty until it is loaded) */
export const cardsOf = (db: ContentDb, pack: string): CardDef[] => (db.packs[pack]?.cards ?? []).map((code) => db.cards[code]).filter(Boolean);
export const packLoaded = (db: ContentDb, pack: string) => !!db.packs[pack]?.loaded;

/**
 * Validate one pack's generated cards with its hand-written overrides and merge the good ones into the database, with
 * their encounter sets; the bad ones are reported with their codes. Used for every pack at build time and for a lazy
 * pack when it is loaded.
 */
export function addPack(
  db: ContentDb,
  pack: string,
  raw: unknown,
  overridesRaw: unknown,
  files: { generated: string; overrides: string } = { generated: `/content/packs/${pack}/cards.generated.json`, overrides: `/content/packs/${pack}/cards.json` },
  cardFile: Record<string, string> = {},
): ContentError[] {
  const errors: ContentError[] = [];
  const overrides = (overridesRaw ?? {}) as Record<string, unknown>;
  const list = raw as { code: string }[];
  for (const [code, o] of Object.entries(overrides)) {
    const r = CardOverride.safeParse(o);
    if (!r.success) errors.push(...zerr(files.overrides, r.error, code));
  }
  const codes: string[] = [];
  for (const base of list) {
    const merged = { ...base, ...((overrides[base.code] as object) ?? {}) };
    const r = CardDef.safeParse(merged);
    if (!r.success) {
      errors.push(...zerr(overrides[base.code] ? files.overrides : files.generated, r.error, base.code));
      continue;
    }
    db.cards[r.data.code] = r.data;
    cardFile[r.data.code] = overrides[base.code] ? files.overrides : files.generated;
    codes.push(r.data.code);
  }
  for (const code of Object.keys(overrides)) {
    if (!list.some((c) => c.code === code)) errors.push({ file: files.overrides, path: code, message: `override for unknown card ${code}` });
  }
  db.packs[pack] = { loaded: true, cards: codes };
  for (const code of codes) {
    const set = db.cards[code].encounterSet;
    if (set && !(db.encounterSets[set] ??= []).includes(code)) db.encounterSets[set].push(code);
  }
  return errors;
}

/**
 * Build the content database from raw files.
 * `files`: path (relative to repo root, e.g. "/content/packs/core/cards.json") -> parsed JSON
 * `scripts`: path -> module default export
 */
export function buildContent(files: Record<string, unknown>, scriptFiles: Record<string, CardScript>, lazyPacks: string[] = []): { db: ContentDb; errors: ContentError[] } {
  const errors: ContentError[] = [];
  const db: ContentDb = { cards: {}, investigators: {}, decks: {}, scenarios: {}, campaigns: {}, scripts: {}, encounterSets: {}, i18n: {}, sounds: EMPTY_SOUNDS, packs: {} };
  const cardFile: Record<string, string> = {};
  const entries = Object.entries(files).sort(([a], [b]) => a.localeCompare(b));
  for (const pack of lazyPacks) db.packs[pack] = { loaded: false, cards: [] };

  // cards: generated + overrides per pack (the packs the browser loads later are only named in `lazyPacks`)
  const generated = entries.filter(([p]) => /\/packs\/[^/]+\/cards\.generated\.json$/.test(p));
  for (const [file, raw] of generated) {
    const pack = file.match(/\/packs\/([^/]+)\//)![1];
    const overridesPath = file.replace("cards.generated.json", "cards.json");
    errors.push(...addPack(db, pack, raw, files[overridesPath] ?? {}, { generated: file, overrides: overridesPath }, cardFile));
  }
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
  parseInto(/\/sounds\/sounds\.json$/, SoundManifest, (v, file) => {
    db.sounds = v;
    // a bed names a scenario that exists
    for (const key of Object.keys(v.music)) {
      const id = key.startsWith("bed:") ? key.slice(4) : null;
      if (id !== null && !db.scenarios[id]) errors.push({ file, path: `music.${key}`, message: `unknown scenario ${id}` });
    }
  });
  // translations, merged field by field: imported *.generated.json, then *.print.json (the text printed on the
  // imported Russian card images), then the hand-written files
  const layer = (suffix?: string) => (suffix === ".generated" ? 0 : suffix === ".print" ? 1 : 2);
  const i18nFiles = entries
    .map(([file, raw]) => ({ file, raw, m: file.match(/\/i18n\/([^/]+)\/(cards|ui|campaigns)(\.generated|\.print)?\.json$/) }))
    .filter((f) => f.m)
    .sort((a, b) => layer(a.m![3]) - layer(b.m![3]));
  for (const { file, raw, m } of i18nFiles) {
    const [, locale, kind] = m!;
    const loc = (db.i18n[locale] ??= { cards: {}, ui: {}, campaigns: { campaigns: {}, scenarios: {}, encounterSets: {} } });
    if (kind === "cards") {
      const r = I18nCards.safeParse(raw);
      if (!r.success) errors.push(...zerr(file, r.error));
      else {
        for (const [code, tr] of Object.entries(r.data)) loc.cards[code] = { ...loc.cards[code], ...tr };
        if (m![3] === ".print") errors.push(...checkPrintText(db, file, r.data));
      }
    } else if (kind === "ui") {
      const r = I18nUi.safeParse(raw);
      if (!r.success) errors.push(...zerr(file, r.error));
      else Object.assign(loc.ui, r.data);
    } else {
      const r = I18nCampaigns.safeParse(raw);
      if (!r.success) errors.push(...zerr(file, r.error));
      else mergeCampaignText(loc.campaigns, r.data);
    }
  }
  for (const [file, mod] of Object.entries(scriptFiles)) {
    const key = file.split("/").pop()!.replace(/\.ts$/, "");
    db.scripts[key] = mod;
  }
  errors.push(...validateRefs(db, cardFile));
  return { db, errors };
}

/** printed card texts: known card codes, and only icon tokens that the cards' own texts use */
export function checkPrintText(db: ContentDb, file: string, data: Record<string, { text?: string; backText?: string }>): ContentError[] {
  const known = new Set<string>();
  for (const c of Object.values(db.cards)) for (const t of [c.text, c.backText]) for (const m of (t ?? "").matchAll(/\[(\w+)\]/g)) known.add(m[1]);
  const errors: ContentError[] = [];
  for (const [code, tr] of Object.entries(data)) {
    if (!db.cards[code]) errors.push({ file, path: code, message: "unknown card code" });
    for (const field of ["text", "backText"] as const)
      for (const m of (tr[field] ?? "").matchAll(/\[(\w+)\]/g)) if (!known.has(m[1])) errors.push({ file, path: `${code}.${field}`, message: `unknown icon [${m[1]}]` });
  }
  return errors;
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

function mergeCampaignText(into: I18nCampaigns, from: I18nCampaigns) {
  for (const [id, c] of Object.entries(from.campaigns)) {
    const prev = into.campaigns[id];
    into.campaigns[id] = { ...prev, ...c, logLabels: { ...prev?.logLabels, ...c.logLabels } };
  }
  for (const [id, sc] of Object.entries(from.scenarios)) {
    const prev = into.scenarios[id];
    const resolutions = { ...prev?.resolutions };
    for (const [k, r] of Object.entries(sc.resolutions)) resolutions[k] = { ...resolutions[k], ...r };
    into.scenarios[id] = { ...prev, ...sc, resolutions };
  }
  Object.assign(into.encounterSets, from.encounterSets);
}
