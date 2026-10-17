import { cardText } from "../../content/i18n";
import { db, useGame } from "../context";
import { Portrait } from "../Portrait";

/** an investigator as the round class-ringed portrait with name and class; `badge` is the P1 to P4 turn-order mark */
export function Avatar({ code, size = 88, badge, children }: { code: string; size?: number; badge?: string; children?: React.ReactNode }) {
  const locale = useGame((s) => s.locale);
  const d = db.cards[code];
  return (
    <span className="wz-avatar">
      <Portrait code={code} size={size} />
      {badge && <span className="badge wz-badge">{badge}</span>}
      <b>{cardText(db, code, locale).name}</b>
      <small>{d.faction}</small>
      {children}
    </span>
  );
}
