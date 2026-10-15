import { useEffect } from "react";
import { cardText, encounterSetName } from "../../content/i18n";
import type { GameState } from "../../engine/types";
import { CardFace } from "../CardFace";
import { db, useGame } from "../context";
import { placeHover } from "../hover";
import { mapProjector } from "../scene/Table";
import { TokenBadges } from "../TokenBadges";
import { useView } from "../view";
import { LocationDetails } from "./HandDetails";
import { formatText } from "./Hud";

/** height reserved for the details panel under the enlarged card */
const DETAILS_H = 170;

/**
 * Hovering any card (map, HUD panels, play strip) shows a copy at twice its on-screen size on the spot,
 * with its name, traits, text and tokens underneath. It never takes the pointer.
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
  if (inst.zone === "location") return <LocationDetails id={hovered} />;
  const rect = hoverRect ?? mapProjector.rect(hovered);
  if (!rect) return null;
  const box = placeHover(rect, DETAILS_H, innerWidth, innerHeight);
  const d = db.cards[inst.code];
  const tx = cardText(db, inst.code, locale);
  const back = d.type === "location" && !inst.revealed;
  const set = d.encounterSet ? encounterSetName(db, d.encounterSet, locale) : null;
  return (
    <div className="hover-card" style={{ left: box.x, top: box.y, width: Math.max(box.w, 260) }}>
      <div className="hover-face" style={{ width: box.w, height: box.h }}>
        <CardFace code={inst.code} locale={locale} side={back ? "back" : "front"} />
        <TokenBadges inst={inst} size={28} />
      </div>
      <div className="hover-details" style={{ maxHeight: DETAILS_H }}>
        <b className="card-name">{back ? tx.backName ?? tx.name : tx.name}</b>
        {tx.subname && <i> — {tx.subname}</i>}
        {(tx.traits?.length || set) && <div className="traits">{[tx.traits?.join(". "), set].filter(Boolean).join(" · ")}</div>}
        <p dangerouslySetInnerHTML={{ __html: formatText(back ? tx.backText ?? "" : tx.text) }} />
      </div>
    </div>
  );
}
