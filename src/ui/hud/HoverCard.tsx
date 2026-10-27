import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cardText } from "../../content/i18n";
import type { GameState, InstId } from "../../engine/types";
import { CardFace } from "../components/CardFace";
import { db, useGame } from "../state/context";
import { centreOn, placeHover } from "../game/hover";
import { Glyph, Icon } from "../components/Icon";
import { optionLabel } from "../game/optionText";
import { mapProjector } from "../scene/Table";
import { IntentBadge, TokenBadges } from "../components/TokenBadges";
import { useCardClick } from "../game/cardClick";
import { useView } from "../state/view";
import { cardDetails } from "../game/details";
import { abilitySymbol, stripAction } from "./ActionRail";
import { DetailsColumn, LocationDetails } from "./HandDetails";
import { stripButtonsFor } from "./Panels";

/**
 * Hovering any card (map, HUD panels, play strip) shows a copy at twice its on-screen size on the spot,
 * with its details column (name, type, stats, text) beside it. The copy never takes the pointer; a play-strip card's
 * option buttons are drawn over the copy's centre and do, and stay up while the pointer crosses onto them.
 */
export function HoverCard() {
  const hovered = useView((s) => s.hovered);
  const hoverRect = useView((s) => s.hoverRect);
  // an HTML card can re-render under the pointer and miss its mouseleave: drop the hover once the pointer is outside it
  useEffect(() => {
    if (!hoverRect) return;
    const move = (e: PointerEvent) => {
      const r = useView.getState().hoverRect;
      if (!r || (e.target as Element | null)?.closest?.(".strip-actions")) return;
      if (e.clientX < r.x0 || e.clientX > r.x1 || e.clientY < r.y0 || e.clientY > r.y1)
        useView.getState().setHover(null);
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [hoverRect]);
  useView((s) => s.camTick); // map cards move with the camera
  const blocked = useView((s) => !!s.moveDrag || !!s.modal);
  const game = useGame((s) => s.game) as GameState;
  const locale = useGame((s) => s.locale);
  const choose = useGame((s) => s.choose);
  const { byCard } = useCardClick();
  // a strip card with options keeps its buttons a moment after the pointer leaves it, so the pointer can cross onto them
  const live =
    hovered &&
    hoverRect &&
    document.querySelector(`[data-ui="play-strip"] [data-card="${hovered}"]`)
      ? stripButtonsFor(hovered, byCard)
      : null;
  const [held, setHeld] = useState<{ id: InstId; rect: NonNullable<typeof hoverRect> } | null>(
    null,
  );
  const onButtons = useRef(false);
  useEffect(() => {
    if (live && hoverRect) return setHeld({ id: live, rect: hoverRect });
    if (hovered) return setHeld(null);
    const t = setTimeout(() => !onButtons.current && setHeld(null), 200);
    return () => clearTimeout(t);
  }, [live, hovered, hoverRect]);
  const keptId = !hovered && held && stripButtonsFor(held.id, byCard) ? held.id : null;
  useEffect(() => {
    if (!keptId && !live) onButtons.current = false;
  }, [keptId, live]);
  const shownId = hovered ?? keptId;
  const buttons = useRef<HTMLDivElement>(null);
  const boxNow = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  // centred on the copy, inside the window (measured: the buttons' size depends on their labels)
  useLayoutEffect(() => {
    const el = buttons.current;
    const box = boxNow.current;
    if (!el || !box) return;
    const p = centreOn(box, el.offsetWidth, el.offsetHeight, innerWidth, innerHeight);
    el.style.left = `${p.x}px`;
    el.style.top = `${p.y}px`;
  });
  boxNow.current = null;
  if (!shownId || blocked || !game.cards[shownId]) return null;
  const inst = game.cards[shownId];
  // hand cards have their own hover (the fan raises and enlarges them); locations get a details column, no copy
  if (inst.zone === "hand") return null;
  // a location on the map gets its details column beside it; an HTML copy of one (feed, chaos draw) gets the enlarged copy
  if (inst.zone === "location" && !hoverRect) return <LocationDetails id={shownId} />;
  const rect = hoverRect ?? (keptId ? held!.rect : mapProjector.rect(shownId));
  if (!rect) return null;
  // the copy alone is kept fully on screen; the details column goes beside it, like for hand cards
  const box = placeHover(rect, 0, innerWidth, innerHeight);
  boxNow.current = box;
  const inStrip = !!document.querySelector(`[data-ui="play-strip"] [data-card="${shownId}"]`);
  const opts = inStrip ? (byCard.get(shownId) ?? []) : [];
  const name = opts.length ? cardText(db, inst.code, locale).name : "";
  const back = db.cards[inst.code].type === "location" && !inst.revealed;
  return (
    <>
      <div className="hover-card" style={{ left: box.x, top: box.y }}>
        <div className="hover-face" style={{ width: box.w, height: box.h }}>
          <CardFace code={inst.code} locale={locale} side={back ? "back" : "front"} />
          <TokenBadges inst={inst} size={28} />
          <IntentBadge inst={inst} words />
        </div>
      </div>
      <DetailsColumn
        rows={cardDetails(db, inst.code, locale, { inst, game })}
        rect={{ x0: box.x, y0: box.y, x1: box.x + box.w, y1: box.y + box.h }}
        prefer={inStrip ? "left" : undefined}
      />
      {opts.length > 0 && (
        <div
          className="strip-actions"
          ref={buttons}
          onMouseEnter={() => (onButtons.current = true)}
          onMouseLeave={(e) => {
            onButtons.current = false;
            // back onto the card itself: still hovering it
            if ((e.relatedTarget as Element | null)?.closest?.(`[data-card="${shownId}"]`)) return;
            setHeld(null);
            useView.getState().setHover(null);
          }}
        >
          {opts.map((o) => {
            const a = stripAction({ ...o, label: optionLabel(o, game, locale) }, name, locale);
            const sym = abilitySymbol(o, game);
            return (
              <button
                key={o.id}
                className="strip-action"
                onClick={() => choose(o.id)}
                title={o.label}
              >
                {sym && <Glyph name={sym} size={18} />}
                {a.icon && <Icon name={a.icon} size={22} />}
                <span>{a.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
