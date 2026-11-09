import { campaignBlurb, logLabel, scenarioText, stepText, t } from "../../content/i18n";
import { flowOf } from "../../content/flow";
import type { CampaignState, WaitingStep } from "../../engine/campaign/types";
import type { ContentDb } from "../../engine/world/types";

/**
 * One page of the story reader (ADR-0084): the guide's words before a scenario, paged from the campaign's state. A page has
 * a stable `id`, so pages kept from earlier states and the ones the state gives now merge without repeating.
 */
export interface ReaderPage {
  id: string;
  kind: "opening" | "story" | "prompt" | "scenario";
  /** the page's heading: the campaign's name, a story's title, a prompt's title, the scenario's name */
  title?: string;
  /** "Scenario I", on a scenario's page */
  label?: string;
  /** the text in the guide's markup, one entry per paragraph */
  paragraphs: string[];
  /** log entries the flow recorded just before this page, as sentences */
  notes: string[];
  /** a prompt page: what the flow asks (a step kind of `WaitingStep`), the flow step it is, and whom it asks (a supply point) */
  prompt?: WaitingStep["kind"];
  step?: string;
  inv?: string;
  /** a scenario page: the scenario it opens */
  scenario?: string;
}

const ROMAN: [number, string][] = [
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];
/** 1 → "I", 4 → "IV", 12 → "XII" */
export function roman(n: number): string {
  let out = "";
  for (const [v, s] of ROMAN)
    while (n >= v) {
      out += s;
      n -= v;
    }
  return out;
}

const BLOCK = /<(\/?)(center|right|blockquote)(?:\s[^>]*)?>/gi;
/** a prose line: lines this long on both sides of a line break are separate paragraphs; shorter ones are verse or a letter */
const PROSE = 80;

/**
 * A guide text as paragraphs: split at blank lines, and at a single line break between two long lines (the guides break
 * paragraphs that way as often as with a blank line); a line break inside a `<center>`, `<right>` or `<blockquote>` never
 * splits, and short lines (a letter, a poem) stay together.
 */
export function paragraphsOf(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let last = 0;
  const depthAt = new Map<number, number>();
  for (const m of text.matchAll(BLOCK)) {
    depth += m[1] ? -1 : 1;
    depthAt.set(m.index, Math.max(0, depth));
    depthAt.set(m.index + m[0].length, Math.max(0, depth));
  }
  const insideBlock = (at: number) => {
    let d = 0;
    for (const [pos, v] of [...depthAt].sort((a, b) => a[0] - b[0])) {
      if (pos > at) break;
      d = v;
    }
    return d > 0;
  };
  for (const m of text.matchAll(/\n+/g)) {
    if (insideBlock(m.index)) continue;
    const before = text.slice(last, m.index);
    const after = text.slice(m.index + m[0].length).split("\n", 1)[0];
    const blank = m[0].length > 1;
    const lastLine = before.slice(before.lastIndexOf("\n") + 1);
    if (!blank && !(lastLine.length >= PROSE && after.length >= PROSE)) continue;
    if (before.trim()) out.push(before.trim());
    last = m.index + m[0].length;
  }
  const rest = text.slice(last).trim();
  if (rest) out.push(rest);
  return out;
}

const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** the scenario's place among the campaign's playable scenarios, as "Scenario II"; none for one outside the order (a side scenario) */
function scenarioLabel(
  db: ContentDb,
  c: CampaignState,
  id: string,
  locale: string,
): string | undefined {
  const playable = flowOf(db, c.campaignId).order.filter((x) => db.scenarios[x]);
  const at = playable.indexOf(id);
  return at < 0 ? undefined : t(db, locale, "reader.scenario", { n: roman(at + 1) });
}

/**
 * Whether the story reader is where the flow is read now: on a new campaign (its prologue and first steps), and after a
 * scenario once its resolution and any interlude have been read on the paper campaign screen, so what the flow shows next
 * is the next scenario's own opening. Not while a scenario is being played, nor when the campaign is over.
 */
export const inReaderTerritory = (c: CampaignState): boolean =>
  !c.result && !c.flow.playing && (!c.history.length || (!c.flow.item && !c.flow.scenario));

/** the scenario the reader is leading to: the one the flow plays, or sets up, or the first of the order not yet played */
export function scenarioAhead(db: ContentDb, c: CampaignState): string | undefined {
  const w = c.flow.waiting;
  if (w?.step.kind === "play") return w.step.scenario;
  const played = new Set(c.history.map((h) => h.scenarioId));
  return (
    (c.flow.play ??
      c.flow.next ??
      flowOf(db, c.campaignId).order.find((id) => db.scenarios[id] && !played.has(id))) ||
    undefined
  );
}

/** whether the flow waits at a prompt the reader hands to the paper campaign screen */
export const handsOver = (c: CampaignState | null | undefined): boolean => {
  const k = c?.flow.waiting?.step.kind;
  return k === "upgradeDecks" || k === "sideScenario";
};

/**
 * The pages the campaign's state gives now: the opening on a new campaign's first look (`first`), a page for each story
 * since the last answer, the prompt the flow waits at, and at "play" the scenario's page. Log entries recorded since the
 * last answer are notes on the page they follow (or the first page, when nothing came before them).
 */
export function pagesNow(
  db: ContentDb,
  c: CampaignState,
  locale: string,
  first: boolean,
): ReaderPage[] {
  const pages: ReaderPage[] = [];
  const stories = c.flow.shown.some((s) => "story" in s);
  const blurb = campaignBlurb(db, c.campaignId, locale).prologue;
  if (first && !c.history.length && blurb && !stories)
    pages.push({
      id: "opening",
      kind: "opening",
      title: db.campaigns[c.campaignId]?.name,
      paragraphs: paragraphsOf(blurb),
      notes: [],
    });
  let pending: string[] = [];
  const attach = (notes: string[]) => {
    const to = pages.at(-1);
    if (to) to.notes.push(...notes);
    else pending = [...pending, ...notes];
  };
  for (const s of c.flow.shown) {
    if ("story" in s) {
      const { title, text } = stepText(db, c.campaignId, s.story, locale);
      pages.push({
        id: `story:${s.story}`,
        kind: "story",
        ...(title ? { title } : {}),
        paragraphs: paragraphsOf(text ?? ""),
        notes: pending,
      });
      pending = [];
    } else attach([sentence(logLabel(db, c.campaignId, s.recorded.id, locale))]);
  }
  const w = c.flow.waiting;
  if (w && w.step.kind === "play") {
    const sc = scenarioText(db, w.step.scenario, locale);
    const label = scenarioLabel(db, c, w.step.scenario, locale);
    pages.push({
      id: `scenario:${w.step.scenario}`,
      kind: "scenario",
      ...(label ? { label } : {}),
      title: sc.name,
      paragraphs: paragraphsOf(sc.intro ?? ""),
      notes: pending,
      scenario: w.step.scenario,
    });
    pending = [];
  } else if (w && w.step.kind !== "continue" && !handsOver(c)) {
    const { title, text } = stepText(db, c.campaignId, w.id, locale);
    const inv = w.step.kind === "buySupplies" ? w.step.inv : undefined;
    pages.push({
      id: `prompt:${w.id}${inv ? `:${inv}` : ""}`,
      kind: "prompt",
      ...(title ? { title } : {}),
      paragraphs: paragraphsOf(text ?? ""),
      notes: pending,
      prompt: w.step.kind,
      step: w.id,
      ...(inv ? { inv } : {}),
    });
    pending = [];
  }
  // entries with no page after them stay with the last page there is
  if (pending.length && pages.length) pages[pages.length - 1].notes.push(...pending);
  return pages;
}

/** the pages already turned (`kept`), then those the state gives now that aren't among them: an answer never removes a page */
export function mergePages(kept: ReaderPage[], now: ReaderPage[]): ReaderPage[] {
  const have = new Set(kept.map((p) => p.id));
  return [...kept, ...now.filter((p) => !have.has(p.id))];
}
