import type { StoreApi } from "zustand";
import type { GameState, InstId, InvId, Zone } from "../engine/types";
import type { UiState } from "./store";

/** a card that just arrived somewhere visible (hand, play area, threat area, map, resolve spot) */
export interface Arrival {
  id: InstId;
  from: Zone;
  to: Zone;
  /** whose hand / play area it went to (null for the map) */
  owner: InvId | null;
  /** the opening hand or a mulligan redraw: no stop at the show spot */
  opening: boolean;
  /** position among arrivals of the same state change going to the same place, for staggering */
  batch: number;
  /** game.log length when it arrived (map cards from an encounter card wait for that event to play) */
  log: number;
  /** it was just drawn as an encounter card and shown in the middle of the screen */
  shown: boolean;
}

const SHOWN = new Set<Zone>(["hand", "play", "threat", "enemy", "location", "attached", "resolving"]);

/** every card that changed into a shown zone between two states (hand cards in hand order first) */
export function diffArrivals(prev: GameState | null, next: GameState): Arrival[] {
  const out: Arrival[] = [];
  const seen = new Set<InstId>();
  const count = new Map<string, number>();
  // encounter cards drawn since the previous state are shown in the middle before they go anywhere
  const recent = next.log.slice(prev ? Math.max(0, Math.min(prev.log.length, next.log.length) - 1) : 0);
  const shownCards = new Set(recent.filter((e) => e.type === "encounter" && e.card).map((e) => e.card!));
  const add = (id: InstId, from: Zone, owner: InvId | null) => {
    const to = next.cards[id].zone;
    const k = `${to}:${owner}`;
    const batch = count.get(k) ?? 0;
    count.set(k, batch + 1);
    seen.add(id);
    out.push({ id, from, to, owner, opening: next.phase === "setup", batch, log: next.log.length, shown: shownCards.has(id) });
  };
  for (const i of next.order)
    for (const id of next.invs[i].hand) {
      const before = prev?.cards[id]?.zone;
      if (before !== "hand") add(id, before ?? "deck", i);
    }
  for (const c of Object.values(next.cards)) {
    if (seen.has(c.id) || !SHOWN.has(c.zone) || c.zone === "hand") continue;
    const before = prev?.cards[c.id]?.zone;
    if (before && before !== c.zone) add(c.id, before, c.controller ?? c.owner);
  }
  return out;
}

const MAX_AGE = 1500;
const reducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

let record = new Map<InstId, Arrival & { at: number }>();

/** the arrival of a card, once, while it is fresh (nothing under reduced motion) */
export function takeArrival(id: InstId, now = performance.now()): Arrival | null {
  const a = record.get(id);
  if (!a) return null;
  record.delete(id);
  if (now - a.at > MAX_AGE || reducedMotion()) return null;
  return a;
}

/** look without taking (the map checks every frame whether an arrival's encounter event has played) */
export const peekArrival = (id: InstId) => record.get(id) ?? null;

let quiet = false;
/** the next new game is a restored or imported one: it is simply shown, nothing flies */
export const quietNextGame = () => {
  quiet = true;
};

/** record arrivals from every game change; a restored game records nothing, a new scenario its opening hand */
export function trackArrivals(store: StoreApi<UiState>) {
  return store.subscribe((s, prev) => {
    if (!s.game || s.game === prev.game) return;
    const now = performance.now();
    let found: Arrival[];
    if (s.setup !== prev.setup || !prev.game) {
      record = new Map();
      found = quiet ? [] : diffArrivals(null, s.game);
      quiet = false;
    } else found = diffArrivals(prev.game, s.game);
    for (const a of found) record.set(a.id, { ...a, at: now });
  });
}

// ---------- last screen rects of HTML cards (a card leaving the hand or strip flies from where it was) ----------
export interface ScreenBox {
  x: number;
  y: number;
  w: number;
  h: number;
}
export const lastRects = new Map<InstId, ScreenBox>();
export const rememberRect = (id: InstId, el: Element) => {
  const r = el.getBoundingClientRect();
  if (r.width) lastRects.set(id, { x: r.left, y: r.top, w: r.width, h: r.height });
};

// ---------- where an arrival flies from ----------
/** named HUD places an arrival can start from */
export type Place = "deck" | "discard" | "encounter" | "encounterDiscard" | "resolve" | "actAgenda" | "piles" | "fan" | "strip";

/** the screen box an arriving card starts from: its old HTML rect, the pile or panel it came from, or a small box mid-screen */
export function originRect(a: Arrival, viewer: InvId | null, find: (p: Place) => ScreenBox | null, last: (id: InstId) => ScreenBox | null, vw: number, vh: number): ScreenBox {
  const mine = a.owner === viewer;
  const place = (): ScreenBox | null => {
    if (a.shown || a.from === "resolving") return find("resolve");
    switch (a.from) {
      case "hand":
        return last(a.id) ?? find("fan");
      case "play":
      case "threat":
        return last(a.id) ?? find("strip");
      case "deck":
        return mine ? find("deck") : find("piles");
      case "discard":
        return mine ? find("discard") : find("piles");
      case "encounterDeck":
        return find("encounter");
      case "encounterDiscard":
        return find("encounterDiscard");
      default:
        return a.to === "location" ? find("actAgenda") : null;
    }
  };
  return place() ?? { x: vw / 2 - 40, y: vh / 2 - 56, w: 80, h: 112 };
}

const SELECTORS: Record<Place, string> = {
  deck: '[data-pile="deck"] .pile-card',
  discard: '[data-pile="discard"] .pile-card',
  encounter: '[data-pile="encounter"] .pile-card',
  encounterDiscard: '[data-pile="encounterDiscard"] .pile-card',
  resolve: "",
  actAgenda: ".scenario-panel",
  piles: ".pile-column",
  fan: ".hand-fan",
  strip: ".play-strip",
};

/** the real places on screen */
export function domPlace(p: Place, resolve: () => ScreenBox): ScreenBox | null {
  if (p === "resolve") return resolve();
  const r = document.querySelector(SELECTORS[p])?.getBoundingClientRect();
  return r && r.width ? { x: r.left, y: r.top, w: r.width, h: r.height } : null;
}
