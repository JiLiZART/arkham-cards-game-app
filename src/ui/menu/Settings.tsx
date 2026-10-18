import { useState } from "react";
import { locales, t } from "../../content/i18n";
import { db, gameStore, useGame } from "../context";
import { safeStorage, type Pace } from "../store";
import { TIPS_KEY } from "../tips";

const tr = (key: string, vars?: Record<string, string | number>) => t(db, gameStore.getState().locale, key, vars);

/** language, tap decks to draw, draw by hand, pace, tips, reset tips, music and effects, behind the gear */
export function Settings() {
  const locale = useGame((s) => s.locale);
  const drawByHand = useGame((s) => s.drawByHand);
  const tapDecks = useGame((s) => s.tapDecks);
  const pace = useGame((s) => s.pace);
  const tipsOn = useGame((s) => s.tipsOn);
  const musicVolume = useGame((s) => s.musicVolume);
  const sfxVolume = useGame((s) => s.sfxVolume);
  const [tipsReset, setTipsReset] = useState(false);
  const { setLocale, setTapDecks, setDrawByHand, setPace, setTipsOn, setVolume } = gameStore.getState();
  return (
    <div className="screen settings-screen">
      <h1>{tr("settings.title")}</h1>
      <section className="settings">
        <label>
          {tr("menu.language")}{" "}
          <select value={locale} onChange={(e) => setLocale(e.target.value)}>
            {locales(db).map((l) => (
              <option key={l} value={l}>{l.toUpperCase()}</option>
            ))}
          </select>
        </label>
        <label>
          <input type="checkbox" checked={tapDecks} onChange={(e) => setTapDecks(e.target.checked)} /> {tr("menu.tapDecks")}
        </label>
        <label>
          <input type="checkbox" checked={drawByHand} onChange={(e) => setDrawByHand(e.target.checked)} /> {tr("menu.drawByHand")}
        </label>
        <label title={tr(`pace.${pace}.hint`)}>
          {tr("menu.pace")}{" "}
          <select value={pace} onChange={(e) => setPace(e.target.value as Pace)}>
            {(["normal", "slow", "tap"] as const).map((p) => (
              <option key={p} value={p}>{tr(`pace.${p}`)}</option>
            ))}
          </select>
        </label>
        <label>
          <input type="checkbox" checked={tipsOn} onChange={(e) => setTipsOn(e.target.checked)} /> {tr("menu.tips")}
        </label>
        <label className="slider">
          {tr("menu.music")} <input type="range" min={0} max={100} value={musicVolume} onChange={(e) => setVolume("music", Number(e.target.value))} /> <span>{musicVolume}</span>
        </label>
        <label className="slider">
          {tr("menu.effects")} <input type="range" min={0} max={100} value={sfxVolume} onChange={(e) => setVolume("effects", Number(e.target.value))} /> <span>{sfxVolume}</span>
        </label>
        <button
          disabled={tipsReset}
          onClick={() => {
            safeStorage().removeItem(TIPS_KEY);
            setTipsReset(true);
          }}
        >
          {tr("menu.resetTips")}{tipsReset ? " ✔" : ""}
        </button>
      </section>
      <button className="primary big" onClick={() => gameStore.setState({ screen: "title" })}>
        {tr("wizard.back")}
      </button>
    </div>
  );
}
