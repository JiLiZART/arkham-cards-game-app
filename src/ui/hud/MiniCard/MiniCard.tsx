import { type MouseEvent as ReactMouseEvent } from "react";
import { cardText } from "../../../content/i18n";
import type { GameState, InstId } from "../../../engine/types";
import { CardFace } from "../../components/CardFace";
import { db, useGame } from "../../state/context";
import { backUrl, isEncounterCard } from "../../assets/images";
import { IntentBadge, TokenBadges } from "../../components/TokenBadges";
import { useDimmed, useView } from "../../state/view";

/** hovering an HTML card shows the enlarged copy over it */
export const hoverProps = (id: InstId | null) => ({
  onMouseEnter: (e: ReactMouseEvent<HTMLElement>) =>
    id && useView.getState().setHover(id, e.currentTarget.getBoundingClientRect()),
  // onto a strip card's own option buttons (drawn over it) is still hovering that card
  onMouseLeave: (e: ReactMouseEvent<HTMLElement>) => {
    if ((e.relatedTarget as Element | null)?.closest?.('[data-ui="strip-actions"]')) return;
    useView.getState().setHover(null);
  },
});

/** a small HTML card: its scan (or the card back), tokens, highlight when it has options */
/** `hover: false`: no enlarged copy and details column on hover (the scenario panel's cards: a tap opens the viewer) */
export function MiniCard({
  id,
  w,
  h,
  legal,
  exhausted,
  target,
  onClick,
  faceDown,
  hover = true,
}: {
  id: InstId;
  w: number | string;
  h: number | string;
  legal?: boolean;
  exhausted?: boolean;
  target?: boolean;
  faceDown?: boolean;
  hover?: boolean;
  onClick?: (e: ReactMouseEvent) => void;
}) {
  const game = useGame((s) => s.game) as GameState;
  const locale = useGame((s) => s.locale);
  const dimmed = useDimmed(id);
  const inst = game.cards[id];
  if (!inst) return null;
  const d = db.cards[inst.code];
  return (
    <button
      className={`mini-card ${legal ? "legal" : ""} ${exhausted ? "exhausted" : ""} ${target ? "target" : ""} ${dimmed ? "dimmed" : ""}`}
      data-card={id}
      style={{ width: w, height: h }}
      onClick={onClick}
      title={faceDown ? undefined : cardText(db, inst.code, locale).name}
      data-hover={hover ? undefined : "off"}
      {...(faceDown || !hover ? {} : hoverProps(id))}
    >
      {faceDown ? (
        <img src={backUrl(isEncounterCard(d) ? "encounter" : "player")} alt="" draggable={false} />
      ) : (
        <CardFace code={inst.code} locale={locale} />
      )}
      <TokenBadges inst={inst} size={20} />
      <IntentBadge inst={inst} />
    </button>
  );
}
