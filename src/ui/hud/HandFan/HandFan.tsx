import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { cardText } from "../../../content/i18n";
import type { ChoiceOption, GameState, InstId } from "../../../engine/types";
import { db, useGame } from "../../state/context";
import { CardFace as Face } from "../../components/CardFace";
import { backUrl } from "../../assets/images";
import {
  domPlace,
  lastRects,
  noteLocalMove,
  originRect,
  rememberRect,
  takeArrival,
  takeLocalMove,
  type Arrival,
} from "../../game/arrivals";
import { placeDetails } from "../../game/details";
import { useChoicesOffered, useShown } from "../../state/usePlayers";
import { outsideSpotlight, useView } from "../../state/view";
import { moment } from "../SoundLayer";
import { GlanceBadge } from "../GlanceBadge";
import { useViewport } from "../../state/layoutMode";
import {
  boxTransform,
  dockRadius,
  dockRect,
  dockTransform,
  dockWeight,
  FAN_CARD_H,
  FAN_CARD_W,
  FAN_LEGAL_RAISE,
  FAN_REST_VISIBLE,
  fanLayout,
  fanWidth,
  hoverScale,
  showBox,
  statBarW,
} from "../fan";
import { flyDraw, flyIn, STAGGER_MS } from "../flights";
import { DETAILS_W, HandDetails } from "../HandDetails";
import { mulliganPicks } from "../MulliganRow";
import { RESOLVE_BOX } from "../Reveal";
import { cx } from "../../components/cx";
import styles from "./HandFan.module.css";

const DRAG_TO_PLAY = 110;
/** easing time constant of the Dock magnification (ms) */
const EASE_MS = 70;

/**
 * The hand on screen (shared by the desktop fan and the phone's hand drawer): the investigator being looked at
 * (ADR-0004), their cards, and each card's options when that investigator decides.
 */
export function useHand() {
  const game = useGame((s) => s.game) as GameState;
  const busy = useGame((s) => !!s.current || s.queue.length > 0);
  const viewer = useShown();
  const offered = useChoicesOffered();
  const visible = !!viewer;
  // cards picked for the mulligan sit on the "to redraw" row instead
  const picks = mulliganPicks(game, viewer);
  // cards just drawn wait in the showcase until sent on
  const showcase = useView((s) => s.showcase);
  const hand =
    viewer && visible
      ? game.invs[viewer].hand.filter((h) => !picks.includes(h) && !showcase.includes(h))
      : [];
  const optionsFor = (id: InstId): ChoiceOption[] =>
    (!busy && offered && game.pending?.options.filter((o) => o.card === id)) || [];
  return { viewer, visible, hand, optionsFor };
}

/**
 * The viewing investigator's hand as a Hearthstone-style fan along the bottom edge. Moving the pointer along it
 * magnifies like the macOS Dock: the card under the pointer grows most, its neighbours a little, all eased per frame.
 */
export function HandFan() {
  const game = useGame((s) => s.game) as GameState;
  const locale = useGame((s) => s.locale);
  const choose = useGame((s) => s.choose);
  const openMenu = useView((s) => s.openMenu);
  const setHovered = useView((s) => s.setHovered);
  const spotlight = useView((s) => s.spotlight);
  const { width: vw, height: vh } = useViewport();
  // the fan starts after the stat bar, whose size follows the window
  const FAN_LEFT = statBarW(vw, vh) + 12;
  const [drag, setDrag] = useState<{
    id: InstId;
    startX: number;
    startY: number;
    dx: number;
    dy: number;
  } | null>(null);
  const dragRef = useRef(drag);
  dragRef.current = drag;
  // the card the Dock is centred on (nearest the pointer, or keyboard-focused): it gets the details column
  const [focus, setFocus] = useState<InstId | null>(null);

  const { viewer, visible, hand, optionsFor } = useHand();

  const width = fanWidth(vw, statBarW(vw, vh));
  const slots = fanLayout(hand.length, width);
  const k = hoverScale(window.innerHeight);
  const raiseOf = (id: InstId) => (optionsFor(id).length ? FAN_LEGAL_RAISE : 0);

  // animation state lives in refs: the frame loop writes transforms directly, React only re-renders when the focus changes
  const els = useRef(new Map<InstId, HTMLButtonElement>());
  const weights = useRef(new Map<InstId, number>());
  const pointerX = useRef<number | null>(null);
  const keyFocus = useRef<InstId | null>(null);
  const detailsBox = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const live = useRef({ hand, slots, k, raiseOf, focus, drag: drag?.id ?? null });
  live.current = { hand, slots, k, raiseOf, focus, drag: drag?.id ?? null };

  const target = (i: number): number => {
    const { hand, slots, drag } = live.current;
    if (drag) return 0;
    if (keyFocus.current) return hand[i] === keyFocus.current ? 1 : 0;
    if (pointerX.current === null) return 0;
    const step = slots.length > 1 ? slots[1].x - slots[0].x : FAN_CARD_W;
    return dockWeight(slots[i].x, pointerX.current, dockRadius(step));
  };

  const apply = () => {
    const { hand, slots, k, raiseOf, focus, drag } = live.current;
    hand.forEach((id, i) => {
      const el = els.current.get(id);
      if (!el || id === drag) return;
      const w = weights.current.get(id) ?? 0;
      el.style.transform = dockTransform(slots[i], w, k, raiseOf(id));
      // bigger cards on top, the resting order otherwise
      el.style.zIndex = String(i + 1 + Math.round(w * 100));
    });
    const box = detailsBox.current;
    const fi = focus ? hand.indexOf(focus) : -1;
    if (box && fi >= 0) {
      const p = placeDetails(
        dockRect(
          slots[fi],
          weights.current.get(focus!) ?? 0,
          k,
          raiseOf(focus!),
          FAN_LEFT,
          innerHeight,
        ),
        DETAILS_W,
        box.offsetHeight,
        innerWidth,
        innerHeight,
      );
      box.style.left = `${p.x}px`;
      box.style.top = `${p.y}px`;
    }
  };

  // ease every weight toward its target; stop once everything has settled
  const start = () => {
    if (frame.current) return;
    let last = performance.now();
    const tick = (now: number) => {
      const a = 1 - Math.exp(-(now - last) / EASE_MS);
      last = now;
      let moving = false;
      live.current.hand.forEach((id, i) => {
        const cur = weights.current.get(id) ?? 0;
        const t = target(i);
        const next = Math.abs(t - cur) < 0.002 ? t : cur + (t - cur) * a;
        if (next !== t) moving = true;
        weights.current.set(id, next);
      });
      apply();
      frame.current = moving ? requestAnimationFrame(tick) : 0;
    };
    frame.current = requestAnimationFrame(tick);
  };
  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    },
    [],
  );
  // cards that just arrived fly in from where they came from (a draw: Hearthstone-style, via the show spot)
  const known = useRef<Set<InstId> | null>(null);
  // card ids repeat between games: a new game starts from scratch
  const setup = useGame((st) => st.setup);
  const forSetup = useRef(setup);
  if (forSetup.current !== setup) {
    forSetup.current = setup;
    known.current = null;
  }
  const launch = (el: HTMLElement, a: Arrival, i: number) => {
    const from = originRect(
      a,
      viewer,
      (p) => domPlace(p, RESOLVE_BOX),
      (id) => lastRects.get(id) ?? null,
      innerWidth,
      innerHeight,
    );
    const at = (b: { x: number; y: number; w: number; h: number }) =>
      boxTransform(b, slots[i].x, FAN_LEFT, innerHeight);
    const flip = el.querySelector<HTMLElement>('[data-testid="fan-flip"]');
    const delay = a.batch * STAGGER_MS;
    if (a.from === "deck" && !a.opening)
      flyDraw(el, flip, from, showBox(innerWidth, innerHeight), el.style.transform, at, delay);
    else
      flyIn(
        el,
        flip,
        at(from),
        el.style.transform,
        delay,
        a.from === "deck",
        a.opening ? 400 : 450,
      );
  };

  // every render (hand, options, drag changed): put the cards where they belong now, then keep easing
  useLayoutEffect(() => {
    apply();
    start();
    if (!visible) {
      known.current = null;
      return;
    }
    if (!known.current) {
      // first sight of this hand (a new game): it flies in
      known.current = new Set();
    }
    const seen = known.current;
    hand.forEach((id, i) => {
      if (seen.has(id)) return;
      seen.add(id);
      // a card moved inside the HUD (a mulligan pick taken back, a card from the showcase) flies from where it stood
      const from = takeLocalMove(id);
      const a = takeArrival(id);
      const el = els.current.get(id);
      if ((from || a) && el && !a?.opening) moment("draw", id);
      if (from && el)
        flyIn(
          el,
          null,
          boxTransform(from, slots[i].x, FAN_LEFT, innerHeight),
          el.style.transform,
          0,
          false,
          500,
        );
      else if (a && el) launch(el, a, i);
    });
    for (const id of seen) if (!hand.includes(id)) seen.delete(id);
  });

  const focusOn = (id: InstId | null) => {
    if (live.current.focus === id) return;
    live.current.focus = id;
    setFocus(id);
    setHovered(id);
  };
  const onMove = (e: ReactPointerEvent) => {
    if (dragRef.current) return;
    const x = e.clientX - FAN_LEFT;
    pointerX.current = x;
    const { hand, slots } = live.current;
    let best = -1;
    hand.forEach((_, i) => {
      if (best < 0 || Math.abs(slots[i].x - x) < Math.abs(slots[best].x - x)) best = i;
    });
    if (!keyFocus.current) focusOn(best >= 0 ? hand[best] : null);
    start();
  };
  const onLeave = () => {
    pointerX.current = null;
    if (!keyFocus.current) focusOn(null);
    start();
  };

  const act = (id: InstId, x: number, y: number, preferPlay = false) => {
    // a card played from here flies to the table from where it is now
    const el = els.current.get(id);
    if (el) rememberRect(id, el);
    if (el && game.pending?.kind === "mulligan") noteLocalMove(id, el);
    const opts = optionsFor(id);
    const play = opts.filter((o) => o.label.startsWith("Play"));
    const list = preferPlay && play.length ? play : opts;
    if (list.length === 1) choose(list[0].id);
    else if (list.length > 1) openMenu(x, y, list);
  };

  // drag a card upward out of the fan to play it
  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) =>
      setDrag((d) => d && { ...d, dx: e.clientX - d.startX, dy: d.startY - e.clientY });
    const up = (e: PointerEvent) => {
      const d = dragRef.current;
      setDrag(null);
      if (!d) return;
      if (d.dy > DRAG_TO_PLAY) act(d.id, e.clientX, e.clientY, true);
      else if (Math.abs(d.dx) < 6 && Math.abs(d.dy) < 6) act(d.id, e.clientX, e.clientY);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [drag?.id]);

  if (!hand.length) return null;
  const fi = focus && !drag ? hand.indexOf(focus) : -1;
  return (
    <>
      {fi >= 0 && (
        <HandDetails
          id={hand[fi]}
          rect={dockRect(
            slots[fi],
            weights.current.get(hand[fi]) ?? 0,
            k,
            raiseOf(hand[fi]),
            FAN_LEFT,
            innerHeight,
          )}
          boxRef={detailsBox}
        />
      )}
      <div
        className={styles.handFan}
        data-testid="hand-fan"
        data-tip="hand"
        style={{ left: FAN_LEFT, width }}
        aria-label="Your hand"
        onPointerMove={onMove}
        onPointerLeave={onLeave}
      >
        {hand.map((id, i) => {
          const s = slots[i];
          const opts = optionsFor(id);
          const dragging = drag?.id === id;
          return (
            <button
              key={id}
              ref={(el) => {
                if (el) els.current.set(id, el);
                else els.current.delete(id);
              }}
              data-testid="fan-card"
              className={cx(
                styles.fanCard,
                opts.length ? "legal" : "",
                dragging ? styles.dragging : "",
                focus === id ? "focused" : "",
                outsideSpotlight(spotlight, id) ? "dimmed" : "",
              )}
              // transform and z-index come from the frame loop, except while dragging
              style={{
                left: s.x - FAN_CARD_W / 2,
                bottom: FAN_REST_VISIBLE - FAN_CARD_H,
                width: FAN_CARD_W,
                height: FAN_CARD_H,
                ...(dragging
                  ? {
                      zIndex: 200,
                      transform: `translate(${drag.dx}px, ${-Math.max(0, drag.dy)}px) scale(1.2)`,
                    }
                  : {}),
              }}
              onPointerDown={(e: ReactPointerEvent) => {
                if (e.button !== 0) return;
                setDrag({ id, startX: e.clientX, startY: e.clientY, dx: 0, dy: 0 });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  act(id, r.left + r.width / 2, r.top);
                }
              }}
              onFocus={(e) => {
                if (!e.currentTarget.matches(":focus-visible")) return;
                keyFocus.current = id;
                focusOn(id);
                start();
              }}
              onBlur={() => {
                if (keyFocus.current !== id) return;
                keyFocus.current = null;
                if (pointerX.current === null) focusOn(null);
                start();
              }}
              title={cardText(db, game.cards[id].code, locale).name}
            >
              <span className={styles.fanFlip} data-testid="fan-flip">
                <span className={styles.ffFront}>
                  <Face code={game.cards[id].code} locale={locale} />
                  <GlanceBadge card={db.cards[game.cards[id].code]} />
                </span>
                <img className={styles.ffBack} src={backUrl("player")} alt="" draggable={false} />
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
