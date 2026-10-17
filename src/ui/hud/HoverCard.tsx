import { useEffect } from "react";
import type { GameState } from "../../engine/types";
import { CardFace } from "../CardFace";
import { db, useGame } from "../context";
import { placeHover } from "../hover";
import { mapProjector } from "../scene/Table";
import { IntentBadge, TokenBadges } from "../TokenBadges";
import { useView } from "../view";
import { cardDetails } from "../details";
import { DetailsColumn, LocationDetails } from "./HandDetails";

/**
 * Hovering any card (map, HUD panels, play strip) shows a copy at twice its on-screen size on the spot,
 * with its details column (name, type, stats, text) beside it. It never takes the pointer.
 */
export function HoverCard() {
  const hovered = useView((s) => s.hovered);
  const hoverRect = useView((s) => s.hoverRect);
  // an HTML card can re-render under the pointer and miss its mouseleave: drop the hover once the pointer is outside it
  useEffect(() => {
    if (!hoverRect) return;
    const move = (e: PointerEvent) => {
      const r = useView.getState().hoverRect;
      if (r && (e.clientX < r.x0 || e.clientX > r.x1 || e.clientY < r.y0 || e.clientY > r.y1)) useView.getState().setHover(null);
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [hoverRect]);
  useView((s) => s.camTick); // map cards move with the camera
  const blocked = useView((s) => !!s.moveDrag || !!s.modal);
  const game = useGame((s) => s.game) as GameState;
  const locale = useGame((s) => s.locale);
  if (!hovered || blocked || !game.cards[hovered]) return null;
  const inst = game.cards[hovered];
  // hand cards have their own hover (the fan raises and enlarges them); locations get a details column, no copy
  if (inst.zone === "hand") return null;
  // a location on the map gets its details column beside it; an HTML copy of one (feed, chaos draw) gets the enlarged copy
  if (inst.zone === "location" && !hoverRect) return <LocationDetails id={hovered} />;
  const rect = hoverRect ?? mapProjector.rect(hovered);
  if (!rect) return null;
  // the copy alone is kept fully on screen; the details column goes beside it, like for hand cards
  const box = placeHover(rect, 0, innerWidth, innerHeight);
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
      <DetailsColumn rows={cardDetails(db, inst.code, locale, { inst, game })} rect={{ x0: box.x, y0: box.y, x1: box.x + box.w, y1: box.y + box.h }} />
    </>
  );
}
