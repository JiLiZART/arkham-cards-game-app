import { useLayoutEffect, useRef, type RefObject } from "react";
import { domPlace, lastRects, originRect, takeArrival } from "../game/arrivals";
import type { InstId, InvId } from "../../engine/types";
import type { Box } from "./fan";

const EASE = "cubic-bezier(.2,.8,.2,1)";
export const STAGGER_MS = 150;

/** the card ignores the pointer until its flight lands */
function untilLanded(el: HTMLElement, anims: Animation[]) {
  el.style.pointerEvents = "none";
  Promise.all(anims.map((a) => a.finished))
    .catch(() => undefined)
    .finally(() => (el.style.pointerEvents = ""));
}

/**
 * Hearthstone-style draw on a fan card: out of the deck face down, flipping on the way to the show spot,
 * held there, then into its slot. `at(box)` turns a screen box into the card's transform; `rest` is its slot transform.
 */
export function flyDraw(
  el: HTMLElement,
  flip: HTMLElement | null,
  from: Box,
  show: Box,
  rest: string,
  at: (b: Box) => string,
  delay: number,
) {
  const timing = { duration: 1100, delay, easing: "linear", fill: "backwards" as const };
  const card = el.animate(
    [
      { offset: 0, transform: at(from), zIndex: 300, easing: EASE },
      { offset: 0.32, transform: at(show), zIndex: 300 },
      { offset: 0.73, transform: at(show), zIndex: 300, easing: "cubic-bezier(.5,0,.3,1)" },
      { offset: 1, transform: rest, zIndex: 300 },
    ],
    timing,
  );
  const turn = flip?.animate(
    [
      { offset: 0, transform: "rotateY(180deg)" },
      { offset: 0.08, transform: "rotateY(180deg)", easing: "ease-in-out" },
      { offset: 0.3, transform: "rotateY(0deg)" },
      { offset: 1, transform: "rotateY(0deg)" },
    ],
    timing,
  );
  untilLanded(el, turn ? [card, turn] : [card]);
}

/** straight from where the card was to its slot (opening hand, cards returned to hand, cards entering the table) */
export function flyIn(
  el: HTMLElement,
  flip: HTMLElement | null,
  from: string,
  rest: string,
  delay: number,
  faceDown = false,
  duration = 450,
) {
  const timing = { duration, delay, easing: EASE, fill: "backwards" as const };
  const card = el.animate(
    [
      { transform: from, zIndex: 300 },
      { transform: rest, zIndex: 300 },
    ],
    timing,
  );
  const turn =
    faceDown && flip
      ? flip.animate([{ transform: "rotateY(180deg)" }, { transform: "rotateY(0deg)" }], {
          ...timing,
          easing: "ease-in-out",
        })
      : null;
  untilLanded(el, turn ? [card, turn] : [card]);
}

/** the rise out of the pile and the arc to the card's place, in ms */
export const RISE_MS = 220;
export const ARC_MS = 500;
/** a card's start delay when several leave the pile one after another */
export const riseDelay = (k: number) => k * STAGGER_MS;

/**
 * Keyframes for a card leaving a pile: it rises one pile-card height face down, then arcs to its place growing from the
 * pile's size, the turn to face up finishing in the arc's first half. `own` is the card's box at rest.
 */
export function riseAndArcFrames(own: Box, pile: Box) {
  const duration = RISE_MS + ARC_MS;
  const riseEnd = RISE_MS / duration;
  const turned = (RISE_MS + ARC_MS / 2) / duration;
  const card: Keyframe[] = [
    { offset: 0, transform: centreTransform(own, pile), easing: "ease-out" },
    {
      offset: riseEnd,
      transform: centreTransform(own, { ...pile, y: pile.y - pile.h }),
      easing: EASE,
    },
    { offset: 1, transform: "none" },
  ];
  const flip: Keyframe[] = [
    { offset: 0, transform: "rotateY(180deg)" },
    { offset: riseEnd, transform: "rotateY(180deg)", easing: "ease-in-out" },
    { offset: turned, transform: "rotateY(0deg)" },
    { offset: 1, transform: "rotateY(0deg)" },
  ];
  return { card, flip, duration };
}

/** a card (`el`, with an optional `flip` element inside) rises out of the pile at `from` and arcs to its place */
export function riseAndArc(el: HTMLElement, flip: HTMLElement | null, from: Box, delay: number) {
  const r = el.getBoundingClientRect();
  const {
    card,
    flip: turn,
    duration,
  } = riseAndArcFrames({ x: r.left, y: r.top, w: r.width, h: r.height }, from);
  const timing = { duration, delay, fill: "backwards" as const };
  el.animate(card, timing);
  flip?.animate(turn, timing);
}

/** transform that puts an element (untransformed box `own`, pivot at its centre) over a screen box */
export function centreTransform(own: Box, b: Box): string {
  return `translate(${b.x + b.w / 2 - (own.x + own.w / 2)}px, ${b.y + b.h / 2 - (own.y + own.h / 2)}px) scale(${b.w / own.w}, ${b.h / own.h})`;
}

/**
 * HTML cards (`[data-card]` inside `ref`) that just arrived fly in from where they came from.
 */
export function useFlyIn(
  ref: RefObject<HTMLElement>,
  visible: boolean,
  viewer: InvId | null,
  resolve: () => Box,
  game: unknown,
) {
  const known = useRef<Set<InstId> | null>(null);
  // card ids repeat between games: a new game (new setup) starts from scratch
  const forGame = useRef(game);
  if (forGame.current !== game) {
    forGame.current = game;
    known.current = null;
  }
  useLayoutEffect(() => {
    const root = ref.current;
    if (!visible || !root) {
      known.current = null;
      return;
    }
    const els = [
      ...(root.matches("[data-card]") ? [root] : []),
      ...root.querySelectorAll<HTMLElement>("[data-card]"),
    ];
    if (!known.current) {
      known.current = new Set();
    }
    const seen = known.current;
    const ids = new Set<InstId>();
    for (const el of els) {
      const id = el.dataset.card!;
      ids.add(id);
      if (seen.has(id)) continue;
      seen.add(id);
      const a = takeArrival(id);
      if (!a) continue;
      const r = el.getBoundingClientRect();
      const own = { x: r.left, y: r.top, w: r.width, h: r.height };
      const from = originRect(
        a,
        viewer,
        (p) => domPlace(p, resolve),
        (i) => lastRects.get(i) ?? null,
        innerWidth,
        innerHeight,
      );
      const rest = el.style.transform || "none";
      flyIn(
        el,
        null,
        `${centreTransform(own, from)} ${rest === "none" ? "" : rest}`.trim(),
        rest,
        a.batch * STAGGER_MS,
      );
    }
    for (const id of seen) if (!ids.has(id)) seen.delete(id);
  });
}

/** a face-down card (just its back) flying from one screen box to another and fading out there; it lives outside React */
export function flyGhost(src: string, from: Box, to: Box, delay: number) {
  const w = 54;
  const h = 76;
  const img = document.createElement("img");
  img.src = src;
  img.className = "ghost-card";
  img.dataset.ui = "ghost-card";
  img.alt = "";
  Object.assign(img.style, {
    left: `${to.x + to.w / 2 - w / 2}px`,
    top: `${to.y + to.h / 2 - h / 2}px`,
    width: `${w}px`,
    height: `${h}px`,
  });
  document.body.appendChild(img);
  const own = { x: to.x + to.w / 2 - w / 2, y: to.y + to.h / 2 - h / 2, w, h };
  const a = img.animate(
    [
      { transform: centreTransform(own, from), opacity: 1, easing: EASE },
      { transform: "none", opacity: 1, offset: 0.8 },
      { transform: "scale(0.6)", opacity: 0 },
    ],
    { duration: 650, delay, fill: "backwards" },
  );
  a.finished.catch(() => undefined).finally(() => img.remove());
}
