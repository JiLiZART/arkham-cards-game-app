/**
 * The mutable card and investigator records, for the core alone (ADR-0022). Everything else reads through the views
 * `card` and `inv` return and writes through the core's setters; the linter refuses an import of this module outside
 * the core files.
 */
import type { G } from "./core";
import type { CardInst, InstId, InvId, InvState } from "./types";

export const cardRec = (g: G, id: InstId): CardInst => {
  const c = g.s.cards[id];
  if (!c) throw new Error(`no card instance ${id}`);
  return c;
};
export const cardRecIf = (g: G, id: InstId | null | undefined): CardInst | undefined =>
  id ? g.s.cards[id] : undefined;
export const invRec = (g: G, id: InvId): InvState => {
  const i = g.s.invs[id];
  if (!i) throw new Error(`no investigator ${id}`);
  return i;
};
export const invRecIf = (g: G, id: InvId | null | undefined): InvState | undefined =>
  id ? g.s.invs[id] : undefined;
export const allCardRecs = (g: G): CardInst[] => Object.values(g.s.cards);
