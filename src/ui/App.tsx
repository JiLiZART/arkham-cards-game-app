import { useEffect, useRef } from "react";
import { contentErrors } from "../content";
import { t } from "../content/i18n";
import { db, gameStore, useGame } from "./state/context";
import { HandFan } from "./hud/HandFan";
import { HandDrawer } from "./hud/HandDrawer";
import { Hud } from "./hud/Hud";
import { NetIndicator } from "./hud/NetIndicator";
import { moment, useAudioLevels } from "./hud/SoundLayer";
import { Catalog } from "./catalog/Catalog";
import { CampaignScreen } from "./menu/CampaignScreen";
import { HowTo } from "./menu/HowTo";
import { Settings } from "./menu/Settings";
import { Lobby } from "./menu/Lobby";
import { RejoinAsk } from "./menu/RejoinAsk";
import { Title } from "./menu/Title";
import { Wizard } from "./menu/NewGame";
import { Table } from "./scene/Table";
import { checkOnline, joinRoom } from "./state/online";
import { roomFromHash } from "../net/link";
import { useView } from "./state/view";
import { useLayout } from "./state/layoutMode";
import { installTouch } from "./game/touch";
import { LangSwitch } from "./components/LangSwitch";
import { FullscreenAsk, FullscreenButton } from "./components/FullscreenButton";
import styles from "./App.module.css";

/** a phone held upright: the table needs it sideways (nothing about the game changes while this shows) */
function RotateCard() {
  const locale = useGame((s) => s.locale);
  return (
    <div className={styles.rotateCard} role="alert">
      <div className={styles.rotateIcon} aria-hidden>
        📱↻
      </div>
      <h2>{t(db, locale, "phone.rotate")}</h2>
      <p>{t(db, locale, "phone.rotateWhy")}</p>
    </div>
  );
}

/** the top-right corner of every menu screen: the fullscreen toggle (where the page can go fullscreen) and the language tabs */
function Corner() {
  return (
    <div className={styles.langCorner}>
      <NetIndicator />
      <FullscreenButton />
      <LangSwitch />
    </div>
  );
}

export function App() {
  const screen = useGame((s) => s.screen);
  const game = useGame((s) => s.game);
  // a language switch re-renders everything: module-level tr() helpers read the locale without subscribing
  const locale = useGame((s) => s.locale);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const testing = useView((s) => s.testing);
  const { mode, portrait } = useLayout();
  const rotate = mode === "phone" && portrait;
  useEffect(() => {
    gameStore.getState().resume();
    // a link to a room opens it; the save's own room, if it is that one, comes back as the same player
    void checkOnline();
    const room = roomFromHash(location.hash);
    if (room) void joinRoom(room);
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
          <div key={k}>
            {e.file} {e.path}: {e.message}
          </div>
        ))}
      </div>
    );
  }
  if (screen === "game" && game) {
    return (
      <div className={`game ${mode} ${testing ? "testing" : ""}`} data-layout={mode}>
        <RejoinAsk />
        {rotate && <RotateCard />}
        <Table />
        <Hud />
        {mode === "phone" ? <HandDrawer /> : <HandFan />}
        <FullscreenAsk />
      </div>
    );
  }
  const page =
    screen === "log" ? (
      <CampaignScreen />
    ) : screen === "howto" ? (
      <HowTo />
    ) : screen === "wizard" ? (
      <Wizard />
    ) : screen === "settings" ? (
      <Settings />
    ) : screen === "catalog" ? (
      <Catalog />
    ) : screen === "lobby" ? (
      <Lobby />
    ) : (
      <Title />
    );
  // every menu screen but the title is the desk at night: the night ground, paper notes for what is written down
  // menus read the layout mode through this root (ADR-0005): their phone rules hang off `.menus.phone`
  return (
    <div className={`menus ${mode}`} data-layout={mode}>
      {rotate && <RotateCard />}
      <RejoinAsk />
      {/* the lobby keeps its bottom for Start: the ask goes over its heading instead */}
      <FullscreenAsk at={screen === "lobby" ? "top" : "bottom"} />
      {screen === "title" ? (
        <>
          {page}
          <Corner />
        </>
      ) : (
        <div className="desk">
          {page}
          <Corner />
        </div>
      )}
    </div>
  );
}
