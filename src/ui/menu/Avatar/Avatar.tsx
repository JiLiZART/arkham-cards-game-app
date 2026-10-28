import { t } from "../../../content/i18n";
import { db, useGame } from "../../state/context";
import { Portrait } from "../../components/Portrait";
import { investigatorInfo } from "../wizard";
import { cx } from "../../components/cx";
import styles from "./Avatar.module.css";

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
    <span className={styles.wzAvatar}>
      <Portrait code={code} size={size} />
      {badge && <span className={cx(styles.badge, styles.wzBadge)}>{badge}</span>}
      <b>{info.name}</b>
      <small>{t(db, locale, `card.faction.${info.faction}`)}</small>
      {children}
    </span>
  );
}
