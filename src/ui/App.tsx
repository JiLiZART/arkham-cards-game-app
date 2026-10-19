import { useEffect, useRef } from "react";
import { contentErrors } from "../content";
import { t } from "../content/i18n";
import { db, gameStore, useGame } from "./context";
import { HandFan } from "./hud/HandFan";
import { HandDrawer } from "./hud/HandDrawer";
import { Hud } from "./hud/Hud";
import { moment, useAudioLevels } from "./hud/SoundLayer";
import { Catalog } from "./catalog/Catalog";
import { CampaignLog } from "./menu/CampaignLog";
import { HowTo } from "./menu/HowTo";
import { Settings } from "./menu/Settings";
import { Title } from "./menu/Title";
import { Wizard } from "./menu/NewGame";
import { Table } from "./scene/Table";
import { useView } from "./view";
import { useLayout } from "./layoutMode";
import { installTouch } from "./touch";

/** a phone held upright: the table needs it sideways (nothing about the game changes while this shows) */
function RotateCard() {
  const locale = useGame((s) => s.locale);
  return (
    <div className="rotate-card" role="alert">
      <div className="rotate-icon" aria-hidden>📱↻</div>
      <h2>{t(db, locale, "phone.rotate")}</h2>
      <p>{t(db, locale, "phone.rotateWhy")}</p>
    </div>
  );
}

export function App() {
  const screen = useGame((s) => s.screen);
  const game = useGame((s) => s.game);
  const testing = useView((s) => s.testing);
  const { mode, portrait } = useLayout();
  const rotate = mode === "phone" && portrait;
  useEffect(() => {
    gameStore.getState().resume();
  }, []);
  useAudioLevels();
  // a change of screen has its own soft sound (not the first paint)
  const shown = useRef(screen);
  useEffect(() => {
    if (shown.current !== screen) moment("screen");
    shown.current = screen;
  }, [screen]);
  // touch: tap to peek, tap again to choose, long press for the card (mouse unchanged)
  useEffect(() => installTouch(), []);
  if (contentErrors.length) {
    return (
      <div className="screen">
        <h1>Content errors</h1>
        {contentErrors.map((e, k) => (
          <div key={k}>{e.file} {e.path}: {e.message}</div>
        ))}
      </div>
    );
  }
  if (screen === "game" && game) {
    return (
      <div className={`game ${mode} ${testing ? "testing" : ""}`}>
        {rotate && <RotateCard />}
        <Table />
        <Hud />
        {mode === "phone" ? <HandDrawer /> : <HandFan />}
      </div>
    );
  }
  const page = screen === "log" ? <CampaignLog /> : screen === "howto" ? <HowTo /> : screen === "wizard" ? <Wizard /> : screen === "settings" ? <Settings /> : screen === "catalog" ? <Catalog /> : <Title />;
  // every menu screen but the title sits on the rulebook's parchment (public/art)
  return (
    <>
      {rotate && <RotateCard />}
      {screen === "title" ? page : <div className="parchment">{page}</div>}
    </>
  );
}
