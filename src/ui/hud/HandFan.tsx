import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { cardText } from "../../content/i18n";
import type { ChoiceOption, GameState, InstId } from "../../engine/types";
import { db, useGame } from "../context";
import { CardFace as Face } from "../CardFace";
import { handVisible } from "../scene/Table";
import { viewerOf } from "../store";
import { useView } from "../view";
import { FAN_CARD_H, FAN_CARD_W, FAN_LEGAL_RAISE, FAN_REST_VISIBLE, fanLayout, fanWidth, HOVER_LIFT, hoverScale, STAT_BAR_W } from "./fan";

const DRAG_TO_PLAY = 110;

function useViewportWidth() {
  const [w, setW] = useState(() => window.innerWidth);
  useEffect(() => {
    const on = () => setW(window.innerWidth);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return w;
}

/** the viewing investigator's hand as a Hearthstone-style fan along the bottom edge */
export function HandFan() {
  const game = useGame((s) => s.game) as GameState;
  const locale = useGame((s) => s.locale);
  const privacy = useGame((s) => s.privacy);
  const revealedFor = useGame((s) => s.revealedFor);
  const busy = useGame((s) => !!s.current || s.queue.length > 0);
  const choose = useGame((s) => s.choose);
  const openMenu = useView((s) => s.openMenu);
  const setHovered = useView((s) => s.setHovered);
  const vw = useViewportWidth();
  const [drag, setDrag] = useState<{ id: InstId; startX: number; startY: number; dx: number; dy: number } | null>(null);
  const dragRef = useRef(drag);
  dragRef.current = drag;

  const viewer = viewerOf(game);
  const visible = handVisible(privacy, game.order.length, viewer, revealedFor);
  const hand = viewer && visible ? game.invs[viewer].hand : [];
  const optionsFor = (id: InstId): ChoiceOption[] => (!busy && game.pending?.options.filter((o) => o.card === id)) || [];

  const act = (id: InstId, x: number, y: number, preferPlay = false) => {
    const opts = optionsFor(id);
    const play = opts.filter((o) => /^Play/.test(o.label));
    const list = preferPlay && play.length ? play : opts;
    if (list.length === 1) choose(list[0].id);
    else if (list.length > 1) openMenu(x, y, list);
  };

  // drag a card upward out of the fan to play it
  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => setDrag((d) => d && { ...d, dx: e.clientX - d.startX, dy: d.startY - e.clientY });
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
  const width = fanWidth(vw);
  const slots = fanLayout(hand.length, width);
  return (
    <div className="hand-fan" style={{ left: STAT_BAR_W + 12, width, ["--hover-k" as string]: hoverScale(window.innerHeight), ["--hover-lift" as string]: `${HOVER_LIFT}px` }} aria-label="Your hand">
      {hand.map((id, i) => {
        const s = slots[i];
        const opts = optionsFor(id);
        const dragging = drag?.id === id;
        const transform = dragging
          ? `translate(${drag.dx}px, ${-Math.max(0, drag.dy)}px) scale(1.2)`
          : `translateY(${s.y - (opts.length ? FAN_LEGAL_RAISE : 0)}px) rotate(${s.rotate}deg)`;
        return (
          <button
            key={id}
            className={`fan-card ${opts.length ? "legal" : ""} ${dragging ? "dragging" : ""}`}
            style={{ left: s.x - FAN_CARD_W / 2, bottom: FAN_REST_VISIBLE - FAN_CARD_H, width: FAN_CARD_W, height: FAN_CARD_H, zIndex: dragging ? 200 : i + 1, transform }}
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
            onMouseEnter={() => setHovered(id)}
            onMouseLeave={() => setHovered(null)}
            title={cardText(db, game.cards[id].code, locale).name}
          >
            <Face code={game.cards[id].code} locale={locale} />
          </button>
        );
      })}
    </div>
  );
}
