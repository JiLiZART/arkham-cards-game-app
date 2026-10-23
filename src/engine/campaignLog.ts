/**
 * The campaign log in sections (ADR-0011): entries (recorded, crossed out while still shown), counts, card lists and
 * per-investigator counts, as the guide prints them. Every function returns a new log; `flatLog` is the old flat view that
 * scenario setup conditions and scripts read.
 */
export const NOTES = "campaign_notes";

export interface LogEntry {
  id: string;
  crossedOut?: boolean;
  /** what a hand-written resolution recorded besides "yes": a name, a list */
  value?: string | boolean | string[];
}

export interface LogSectionState {
  entries: LogEntry[];
  counts: Record<string, number>;
  cards: Record<string, string[]>;
  /** count id → investigator → number */
  investigators: Record<string, Record<string, number>>;
}

export type CampaignLog = Record<string, LogSectionState>;

const emptySection = (): LogSectionState => ({
  entries: [],
  counts: {},
  cards: {},
  investigators: {},
});
export const emptyLog = (): CampaignLog => ({ [NOTES]: emptySection() });

/** a copy of the log with `section` there, handed to `change` */
function edit(
  log: CampaignLog,
  section: string,
  change: (s: LogSectionState) => void,
): CampaignLog {
  const next = structuredClone(log);
  const s = (next[section] ??= emptySection());
  change(s);
  return next;
}

export function record(
  log: CampaignLog,
  id: string,
  section = NOTES,
  value?: LogEntry["value"],
): CampaignLog {
  return edit(log, section, (s) => {
    const e = s.entries.find((x) => x.id === id);
    const keep = value !== undefined && value !== true ? { value } : {};
    if (!e) s.entries.push({ id, ...keep });
    else {
      delete e.crossedOut;
      Object.assign(e, keep);
    }
  });
}

/** crossed out: still shown, struck through; erased: gone */
export function crossOut(
  log: CampaignLog,
  id: string,
  section = NOTES,
  erase = false,
): CampaignLog {
  return edit(log, section, (s) => {
    if (erase) s.entries = s.entries.filter((x) => x.id !== id);
    else {
      const e = s.entries.find((x) => x.id === id);
      if (e) e.crossedOut = true;
    }
  });
}

/** whether the entry is recorded and not crossed out (or, with `crossed`, whether it is crossed out) */
export function hasEntry(log: CampaignLog, id: string, section = NOTES, crossed = false): boolean {
  const e = log[section]?.entries.find((x) => x.id === id);
  return !!e && !!e.crossedOut === crossed;
}

export const logCount = (log: CampaignLog, id: string, section = NOTES): number =>
  log[section]?.counts[id] ?? 0;

export function setCount(
  log: CampaignLog,
  id: string,
  op: "add" | "set",
  value: number,
  section = NOTES,
): CampaignLog {
  return edit(log, section, (s) => {
    s.counts[id] = op === "set" ? value : (s.counts[id] ?? 0) + value;
  });
}

export function setInvestigatorCount(
  log: CampaignLog,
  id: string,
  inv: string,
  op: "add" | "set",
  value: number,
  section = NOTES,
): CampaignLog {
  return edit(log, section, (s) => {
    const by = (s.investigators[id] ??= {});
    by[inv] = op === "set" ? value : (by[inv] ?? 0) + value;
  });
}

export function addCards(
  log: CampaignLog,
  id: string,
  codes: string[],
  remove = false,
  section = NOTES,
): CampaignLog {
  return edit(log, section, (s) => {
    const now = s.cards[id] ?? [];
    s.cards[id] = remove
      ? now.filter((c) => !codes.includes(c))
      : [...now, ...codes.filter((c) => !now.includes(c))];
  });
}

/** the flat view: entries as true (or their value), counts as numbers, card lists as arrays, every section together */
export function flatLog(log: CampaignLog): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const s of Object.values(log)) {
    for (const e of s.entries) if (!e.crossedOut) out[e.id] = e.value ?? true;
    for (const [id, n] of Object.entries(s.counts)) out[id] = n;
    for (const [id, cards] of Object.entries(s.cards)) out[id] = cards;
  }
  return out;
}

/** a flat log (a save from before the sections) as the notes section: arrays are card lists, the rest entries */
export function migrateLog(flat: Record<string, unknown>): CampaignLog {
  const log = emptyLog();
  for (const [k, v] of Object.entries(flat)) {
    if (Array.isArray(v)) log[NOTES].cards[k] = v.map(String);
    else if (v) log[NOTES].entries.push({ id: k, ...(v === true ? {} : { value: v as string }) });
  }
  return log;
}
