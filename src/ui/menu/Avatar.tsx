import { db, useGame } from "../state/context";
import { Portrait } from "../components/Portrait/index";
import { investigatorInfo } from "./wizard";

/** an investigator as the round class-ringed portrait with name and class; `badge` is the P1 to P4 turn-order mark */
export function Avatar({
  code,
  size = 88,
  badge,
  children,
}: {
  code: string;
  size?: number;
  badge?: string;
  children?: React.ReactNode;
}) {
  const locale = useGame((s) => s.locale);
  const info = investigatorInfo(db, code, locale);
  return (
    <span className="wz-avatar">
      <Portrait code={code} size={size} />
      {badge && <span className="badge wz-badge">{badge}</span>}
      <b>{info.name}</b>
      <small>{info.faction}</small>
      {children}
    </span>
  );
}
