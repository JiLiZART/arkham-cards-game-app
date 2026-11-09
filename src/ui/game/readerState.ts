import { stepText } from "../../content/i18n";
import type { CampaignState } from "../../engine/campaign/types";
import type { ContentDb } from "../../engine/world/types";
import { mergePages, pagesNow, type ReaderPage } from "./readerPages";

/**
 * The story reader's own state (ADR-0084), view state kept in `useView`: the pages already turned or in reach, the page on
 * screen and how many of its paragraphs are shown. Reading pace is viewing, so it is never a move and each online screen
 * has its own.
 */
export interface ReaderState {
  pages: ReaderPage[];
  /** the page on screen */
  at: number;
  /** paragraphs of that page shown */
  revealed: number;
  /** what another player did, by name (online): a prompt's step id → who answered it, "start" → who began the scenario */
  movers: Record<string, string>;
}

/** the reader as it opens: the pages the campaign's state gives now, the first page with its first paragraph */
export function openReader(db: ContentDb, c: CampaignState, locale: string): ReaderState {
  const pages = pagesNow(db, c, locale, true);
  return { pages, at: 0, revealed: Math.min(1, pages[0]?.paragraphs.length ?? 0), movers: {} };
}

/**
 * The reader after the campaign's state moved (an answer here or on another screen): the pages it holds stay, in place, and
 * the ones the state gives now follow. A page already turned never goes away, whatever the flow has answered since.
 */
export function syncReader(
  r: ReaderState,
  db: ContentDb,
  c: CampaignState,
  locale: string,
): ReaderState {
  const pages = mergePages(r.pages, pagesNow(db, c, locale, false));
  return pages.length === r.pages.length ? r : { ...r, pages };
}

/**
 * What a prompt page was answered with, as words, once the flow has moved past it: the choice's text, a number, the
 * investigator's name; "" when the answer has no short form (cards, a list). null while the prompt is still open.
 */
export function answerOf(
  db: ContentDb,
  c: CampaignState,
  locale: string,
  page: ReaderPage,
): string | null {
  if (page.kind !== "prompt" || !page.step) return null;
  const id = page.step;
  const given = c.flow.answers.findLast((a) => a.step === id);
  if (isOpen(c, page) || !given) return null;
  const v = given.value;
  const choices = stepText(db, c.campaignId, id, locale).choices;
  if (typeof v === "string" && choices?.[v]) return choices[v];
  if (typeof v === "number") return String(v);
  if (typeof v === "string" && db.cards[v]?.type === "investigator") return db.cards[v].name;
  return "";
}

/** whether the flow is waiting at this prompt page right now (for a supply point, for this investigator) */
export function isOpen(c: CampaignState, page: ReaderPage): boolean {
  const w = c.flow.waiting;
  if (!w || page.kind !== "prompt" || w.id !== page.step) return false;
  return !page.inv || (w.step.kind === "buySupplies" && w.step.inv === page.inv);
}

/** the first paragraph is shown with the page; a page with no text has nothing to show */
const firstShown = (p: ReaderPage | undefined) => Math.min(1, p?.paragraphs.length ?? 0);

/**
 * A tap, a click, Space or Enter: the next paragraph of the page, else the next page. On the last page the flow's own
 * Continue is answered (`flow`); a prompt or Begin on screen is answered by its own controls, so nothing happens (null).
 */
export function turnPage(
  r: ReaderState,
  c: CampaignState,
): { reader: ReaderState; flow?: "continue" } | null {
  const page = r.pages[r.at];
  if (page && r.revealed < page.paragraphs.length)
    return { reader: { ...r, revealed: r.revealed + 1 } };
  if (r.at < r.pages.length - 1)
    return { reader: { ...r, at: r.at + 1, revealed: firstShown(r.pages[r.at + 1]) } };
  if (c.flow.waiting?.step.kind === "continue") return { reader: r, flow: "continue" };
  return null;
}

/** the whole page at once */
export const revealAll = (r: ReaderState): ReaderState => ({
  ...r,
  revealed: r.pages[r.at]?.paragraphs.length ?? 0,
});

/** whether a page asks the player for something: an open prompt, or Begin on the scenario's page */
const asks = (c: CampaignState, p: ReaderPage) => p.kind === "scenario" || isOpen(c, p);

/**
 * "Skip to the table": to the next page that asks something (an open prompt, Begin), its text all shown; on a page that
 * asks, the rest of its text and no further. Never past a question.
 */
export function skipTo(r: ReaderState, c: CampaignState): ReaderState {
  const here = r.pages[r.at];
  if (here && asks(c, here)) return revealAll(r);
  const to = r.pages.findIndex((p, k) => k > r.at && asks(c, p));
  // nothing asks yet: the last page there is (the flow's Continue goes on from it)
  const at = to < 0 ? r.pages.length - 1 : to;
  return revealAll({ ...r, at });
}
