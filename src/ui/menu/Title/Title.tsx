import { useState } from "react";
import { t } from "../../../content/i18n";
import { db, gameStore, useGame } from "../../state/context";
import { SAVE_KEY, safeStorage } from "../../state/store";
import styles from "./Title.module.css";

const tr = (key: string, vars?: Record<string, string | number>) =>
  t(db, gameStore.getState().locale, key, vars);

/** the first screen, over the cover painting: Continue (with a game or a save), New campaign, How to play and Settings */
export function Title() {
  useGame((s) => s.locale);
  const campaign = useGame((s) => s.campaign);
  const game = useGame((s) => s.game);
  const { resume, abandon } = gameStore.getState();
  // read on every render: Abandon clears the save while this screen stays mounted
  const hasSave = !!safeStorage().getItem(SAVE_KEY);
  // abandoning deletes the save for good: the link asks once, in place
  const [asking, setAsking] = useState(false);
  const go = (screen: "wizard" | "howto" | "settings" | "catalog") =>
    gameStore.setState({ screen });
  return (
    <div className="screen title">
      <div className={styles.titleBody}>
        <h1>{tr("app.title")}</h1>
        <div className={styles.titleButtons}>
          {(game || campaign) && (
            <button
              className="primary big"
              onClick={() => gameStore.setState({ screen: game ? "game" : "log" })}
            >
              {tr("menu.continue")}
            </button>
          )}
          {!game && !campaign && hasSave && (
            <button className="primary big" onClick={() => resume()}>
              {tr("menu.continue")}
            </button>
          )}
          <button
            className={`big ${game || campaign || hasSave ? "" : "primary"}`}
            onClick={() => go("wizard")}
          >
            {tr("menu.newCampaign")}
          </button>
          <button className="big" onClick={() => go("howto")}>
            {tr("menu.howto")}
          </button>
          <button className="big" onClick={() => go("catalog")}>
            {tr("menu.cards")}
          </button>
          <button className="big" onClick={() => go("settings")}>
            {tr("settings.title")}
          </button>
          {campaign && !asking && (
            <button className="link-btn" onClick={() => setAsking(true)}>
              {tr("menu.abandon")}
            </button>
          )}
          {campaign && asking && (
            <div className={styles.abandonAsk} role="group" aria-label={tr("menu.abandon")}>
              <p>{tr("menu.abandonAsk")}</p>
              <button className={styles.danger} onClick={abandon}>
                {tr("menu.abandonYes")}
              </button>
              <button autoFocus onClick={() => setAsking(false)}>
                {tr("menu.abandonNo")}
              </button>
            </div>
          )}
        </div>
      </div>
      <footer>{tr("menu.credit")}</footer>
    </div>
  );
}
