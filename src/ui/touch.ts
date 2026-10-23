import type { InstId } from "../engine/types";
import { useView } from "./view";

/**
 * Touch as its own input: a tap on a card, a marker or a token peeks it (its details and enlarged copy, nothing
 * chosen); a second tap on the same thing within 1.5 s chooses; a long press opens the card modal. A mouse keeps
 * hover and single-click choose. The gate sits in front of `choose`; no component gets a second code path.
 */
export const SECOND_TAP_MS = 1500;
export const LONG_PRESS_MS = 450;
/** a press that moves farther than this is a drag or a pan, not a long press */
const STILL_PX = 10;

export interface TapState {
  id: string | null;
  at: number;
}

/** what a tap on `id` does: peek it, or choose it when it was just peeked */
export function tapDecision(
  prev: TapState,
  id: string,
  now: number,
): { action: "peek" | "choose"; next: TapState } {
  if (prev.id === id && now - prev.at <= SECOND_TAP_MS)
    return { action: "choose", next: { id: null, at: 0 } };
  return { action: "peek", next: { id, at: now } };
}

/** has a press held at `down` turned into a long press by now, at `pos`? */
export function longPressFired(
  down: { x: number; y: number; at: number },
  pos: { x: number; y: number },
  now: number,
): boolean {
  return now - down.at >= LONG_PRESS_MS && Math.hypot(pos.x - down.x, pos.y - down.y) <= STILL_PX;
}

// ---------- live input ----------
/** the kind of pointer that pressed last (click events don't say on every browser) */
let lastPointer: string = "mouse";
let taps: TapState = { id: null, at: 0 };
export const isTouch = () => lastPointer === "touch";

/**
 * A tap on a card that has options: with a mouse it chooses at once; with a finger the first tap peeks it (the details
 * and the enlarged copy, through the hover state) and a second tap within 1.5 s chooses.
 */
export function tapCard(id: InstId, choose: () => void, rect?: DOMRect | null) {
  if (!isTouch()) return choose();
  const d = tapDecision(taps, id, performance.now());
  taps = d.next;
  if (d.action === "choose") {
    useView.getState().setHovered(null);
    return choose();
  }
  if (rect) useView.getState().setHover(id, rect);
  else useView.getState().setHovered(id);
}

/** forget a peek (a tap on empty table) */
export function clearPeek() {
  taps = { id: null, at: 0 };
  if (isTouch()) useView.getState().setHovered(null);
}

/** the map registers how to find the card under a point (it lives in WebGL, not the DOM) */
let mapCardAt: ((x: number, y: number) => InstId | null) | null = null;
export const setMapCardAt = (f: typeof mapCardAt) => (mapCardAt = f);

/** the card under a point: an HTML card (data-card) or a map card */
function cardAt(x: number, y: number): InstId | null {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-card]");
  if (el?.dataset.card) return el.dataset.card;
  return mapCardAt?.(x, y) ?? null;
}

/** watch every press: remember the pointer kind, and a still finger held 450 ms on a card opens its modal */
export function installTouch(): () => void {
  let down: { x: number; y: number; at: number; id: number } | null = null;
  let pos = { x: 0, y: 0 };
  let timer: ReturnType<typeof setTimeout> | undefined;
  let swallow = false;
  const onDown = (e: PointerEvent) => {
    lastPointer = e.pointerType;
    clearTimeout(timer);
    down = null;
    if (e.pointerType !== "touch") return;
    down = { x: e.clientX, y: e.clientY, at: performance.now(), id: e.pointerId };
    pos = { x: e.clientX, y: e.clientY };
    timer = setTimeout(() => {
      if (!down || !longPressFired(down, pos, performance.now())) return;
      const card = cardAt(down.x, down.y);
      if (!card) return;
      // the finger's release must not also tap what is under it
      swallow = true;
      useView.getState().setHovered(null);
      useView.getState().setModal({ card });
    }, LONG_PRESS_MS);
  };
  const onMove = (e: PointerEvent) => {
    if (down && e.pointerId === down.id) pos = { x: e.clientX, y: e.clientY };
  };
  const onUp = () => {
    clearTimeout(timer);
    down = null;
  };
  const onClick = (e: MouseEvent) => {
    if (!swallow) return;
    swallow = false;
    e.stopPropagation();
    e.preventDefault();
  };
  addEventListener("pointerdown", onDown, true);
  addEventListener("pointermove", onMove, true);
  addEventListener("pointerup", onUp, true);
  addEventListener("pointercancel", onUp, true);
  addEventListener("click", onClick, true);
  return () => {
    clearTimeout(timer);
    removeEventListener("pointerdown", onDown, true);
    removeEventListener("pointermove", onMove, true);
    removeEventListener("pointerup", onUp, true);
    removeEventListener("pointercancel", onUp, true);
    removeEventListener("click", onClick, true);
  };
}
