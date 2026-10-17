import { t } from "../../content/i18n";
import { db, gameStore, useGame } from "../context";
import { SAVE_KEY, safeStorage } from "../store";

const tr = (key: string, vars?: Record<string, string | number>) => t(db, gameStore.getState().locale, key, vars);

/** the first screen: Continue (with a game or a save), New campaign, How to play, and the gear for settings */
export function Title() {
  useGame((s) => s.locale);
  const campaign = useGame((s) => s.campaign);
  const game = useGame((s) => s.game);
  const { resume, abandon } = gameStore.getState();
  // read on every render: Abandon clears the save while this screen stays mounted
  const hasSave = !!safeStorage().getItem(SAVE_KEY);
  const go = (screen: "wizard" | "howto" | "settings") => gameStore.setState({ screen });
  return (
    <div className="screen title">
      <button className="gear" aria-label={tr("settings.title")} title={tr("settings.title")} onClick={() => go("settings")}>
        ⚙
      </button>
      <div className="title-body">
        <h1>{tr("app.title")}</h1>
        <div className="title-buttons">
          {(game || campaign) && (
            <button className="primary big" onClick={() => gameStore.setState({ screen: game ? "game" : "log" })}>
              {tr("menu.continue")}
            </button>
          )}
          {!game && !campaign && hasSave && (
            <button className="primary big" onClick={() => resume()}>
              {tr("menu.continue")}
            </button>
          )}
          <button className={`big ${game || campaign || hasSave ? "" : "primary"}`} onClick={() => go("wizard")}>
            {tr("menu.newCampaign")}
          </button>
          <button className="big" onClick={() => go("howto")}>
            {tr("menu.howto")}
          </button>
          {campaign && (
            <button className="link-btn" onClick={abandon}>
              {tr("menu.abandon")}
            </button>
          )}
        </div>
      </div>
      <footer>Card data from ArkhamDB · images from arkham.build. Arkham Horror: The Card Game is © Fantasy Flight Games; fan project for personal use.</footer>
    </div>
  );
}
