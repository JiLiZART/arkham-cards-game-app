import { t } from "../../../content/i18n";
import { db, gameStore, useGame } from "../../state/context";
import { joinRoom, useOnline } from "../../state/online";
import styles from "./RejoinAsk.module.css";

/**
 * A saved game that belongs to an online room, opened without the room's link: it would be played alone, and drift from
 * the room's log. So the player is asked first: back into the room, or on with it here, leaving the room.
 */
export function RejoinAsk() {
  const locale = useGame((s) => s.locale);
  const room = useGame((s) => s.room);
  const session = useOnline((s) => s.session);
  if (!room || session) return null;
  const tr = (key: string) => t(db, locale, key);
  return (
    <div className={styles.veil} data-testid="rejoin-ask">
      <div className={styles.card} role="dialog" aria-modal="true" aria-labelledby="rejoin-title">
        <h2 id="rejoin-title">{tr("net.ask.title")}</h2>
        <p>{tr("net.ask.body")}</p>
        <div className={styles.buttons}>
          <button className="primary big" autoFocus onClick={() => void joinRoom(room.id)}>
            {tr("net.ask.rejoin")}
          </button>
          <button className="big" onClick={() => gameStore.getState().setRoom(null)}>
            {tr("net.ask.leave")}
          </button>
        </div>
      </div>
    </div>
  );
}
