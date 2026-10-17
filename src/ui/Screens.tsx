import { useMemo, useState } from "react";
import { campaignName, cardText, locales, logLabel, scenarioText, t } from "../content/i18n";
import type { Difficulty } from "../content/schema";
import { currentScenarioId } from "../engine/campaign";
import { validateDeck } from "../engine/decks";
import { db, gameStore, useGame } from "./context";
import { cardImage } from "./images";
import { SAVE_KEY, safeStorage, type Pace } from "./store";
import { TIPS_KEY } from "./tips";

const tr = (key: string, vars?: Record<string, string | number>) => t(db, gameStore.getState().locale, key, vars);

export function MenuScreen() {
  const locale = useGame((s) => s.locale);
  const privacy = useGame((s) => s.privacy);
  const drawByHand = useGame((s) => s.drawByHand);
  const pace = useGame((s) => s.pace);
  const tipsOn = useGame((s) => s.tipsOn);
  const musicVolume = useGame((s) => s.musicVolume);
  const sfxVolume = useGame((s) => s.sfxVolume);
  const [tipsReset, setTipsReset] = useState(false);
  const campaign = useGame((s) => s.campaign);
  const game = useGame((s) => s.game);
  const { newCampaign, resume, setLocale, setPrivacy, setDrawByHand, setPace, setTipsOn, setVolume, abandon } = gameStore.getState();
  const hasSave = useMemo(() => !!safeStorage().getItem(SAVE_KEY), []);
  const campaigns = Object.values(db.campaigns);
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? "");
  const [difficulty, setDifficulty] = useState<Difficulty>("standard");
  const investigators = Object.values(db.investigators);
  const [picked, setPicked] = useState<{ code: string; deckId: string }[]>([]);
  const decksFor = (code: string) => Object.values(db.decks).filter((d) => d.investigator === code);
  const problems = picked.flatMap((p) => validateDeck(db, db.decks[p.deckId]).map((x) => `${db.cards[p.code].name}: ${x.message}`));
  const diffs = Object.keys(db.campaigns[campaignId]?.chaosBags ?? {}).filter((d) => d === "easy" || d === "standard") as Difficulty[];

  const toggle = (code: string) =>
    setPicked((p) => (p.some((x) => x.code === code) ? p.filter((x) => x.code !== code) : p.length < 4 ? [...p, { code, deckId: decksFor(code)[0]?.id ?? "" }] : p));

  return (
    <div className="screen menu">
      <h1>{tr("app.title")}</h1>
      <div className="row">
        {(game || campaign) && <button className="primary big" onClick={() => gameStore.setState({ screen: game ? "game" : "log" })}>{tr("menu.continue")}</button>}
        {!game && !campaign && hasSave && <button className="primary big" onClick={() => resume()}>{tr("menu.continue")}</button>}
        {campaign && <button onClick={abandon}>{tr("menu.abandon")}</button>}
        <button onClick={() => gameStore.setState({ screen: "howto" })}>{tr("menu.howto")}</button>
      </div>
      <section>
        <h2>{tr("menu.newCampaign")}</h2>
        <label>
          {tr("menu.campaign")}{" "}
          <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{campaignName(db, c.id, locale)}</option>
            ))}
          </select>
        </label>
        <label>
          {tr("menu.difficulty")}{" "}
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
            {diffs.map((d) => (
              <option key={d} value={d}>{tr(`difficulty.${d}`)}</option>
            ))}
          </select>
        </label>
        <h3>{tr("menu.investigators")} (1–4)</h3>
        <div className="inv-grid">
          {investigators.map((i) => {
            const sel = picked.find((p) => p.code === i.code);
            const k = picked.findIndex((p) => p.code === i.code);
            const name = cardText(db, i.code, locale);
            return (
              <div key={i.code} className={`inv-card ${sel ? "selected" : ""}`} onClick={() => toggle(i.code)}>
                <img src={cardImage(db.cards[i.code], "front", locale) ?? ""} alt="" onError={(e) => (e.currentTarget.style.display = "none")} />
                <div>
                  <b>{name.name}</b> {sel && <span className="badge">P{k + 1}</span>}
                  <div className="sub">{name.subname}</div>
                  {sel && (
                    <select value={sel.deckId} onClick={(e) => e.stopPropagation()} onChange={(e) => setPicked((p) => p.map((x) => (x.code === i.code ? { ...x, deckId: e.target.value } : x)))}>
                      {decksFor(i.code).map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {problems.length > 0 && <div className="problems">{problems.map((p) => <div key={p}>{p}</div>)}</div>}
        <button
          className="primary big"
          disabled={!picked.length || problems.length > 0}
          onClick={() => newCampaign({ campaignId, difficulty, seed: Date.now() >>> 0, investigators: picked })}
        >
          {tr("menu.start")}
        </button>
      </section>
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
          <input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} /> {tr("menu.privacy")}
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
      <footer>Card data from ArkhamDB · images from arkham.build. Arkham Horror: The Card Game is © Fantasy Flight Games; fan project for personal use.</footer>
    </div>
  );
}

/** the five-part summary for reading before the first game: the same plain words as the tips */
export function HowToScreen() {
  useGame((s) => s.locale);
  return (
    <div className="screen howto">
      <h1>{tr("howto.title")}</h1>
      {(["goal", "round", "turn", "tests", "enemies"] as const).map((part, k) => (
        <section key={part}>
          <h2>
            {k + 1}. {tr(`howto.${part}.title`)}
          </h2>
          <p>{tr(`howto.${part}.text`)}</p>
        </section>
      ))}
      <button className="primary" onClick={() => gameStore.setState({ screen: "menu" })}>
        {tr("howto.back")}
      </button>
    </div>
  );
}

export function CampaignLogScreen() {
  const campaign = useGame((s) => s.campaign);
  const notice = useGame((s) => s.notice);
  const locale = useGame((s) => s.locale);
  if (!campaign) return null;
  const def = db.campaigns[campaign.campaignId];
  const next = currentScenarioId(db, campaign);
  const label = (k: string) => logLabel(db, def.id, k, locale);
  return (
    <div className="screen log">
      <h1>{campaignName(db, def.id, locale)} — {campaign.result ? tr("log.summary") : tr("log.title")}</h1>
      {notice && <div className="notice">{notice}</div>}
      {campaign.result && <h2 className={`result-${campaign.result}`}>{tr(`result.${campaign.result}`)}</h2>}
      <section>
        <h3>Scenarios</h3>
        {campaign.history.map((h) => (
          <div key={h.scenarioId}>
            {scenarioText(db, h.scenarioId, locale).name}: {scenarioText(db, h.scenarioId, locale).resolution(h.resolution)?.title ?? h.resolution} · victory {h.victory} · +{h.xp} XP
          </div>
        ))}
      </section>
      <section>
        <h3>{tr("log.title")}</h3>
        {Object.entries(campaign.log).map(([k, v]) => (
          <div key={k}>
            {Array.isArray(v) ? (
              <>
                <b>{label(k)}:</b> {v.length ? v.map((c) => cardText(db, c, locale).name).join(", ") : "—"}
              </>
            ) : (
              label(k)
            )}
          </div>
        ))}
      </section>
      <section>
        <h3>{tr("menu.investigators")}</h3>
        <table>
          <thead>
            <tr><th /><th>XP</th><th>Physical trauma</th><th>Mental trauma</th><th>Status</th></tr>
          </thead>
          <tbody>
            {campaign.investigators.map((i) => (
              <tr key={i.code}>
                <td>{cardText(db, i.code, locale).name}</td>
                <td>{i.xp}</td>
                <td>{i.physicalTrauma}</td>
                <td>{i.mentalTrauma}</td>
                <td>{i.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <div className="row">
        {!campaign.result && next && (
          <button className="primary big" onClick={() => gameStore.getState().startScenario()}>
            {tr("log.next")}: {scenarioText(db, next, locale).name}
          </button>
        )}
        <button onClick={() => gameStore.setState({ screen: "menu" })}>{tr("hud.menu")}</button>
      </div>
    </div>
  );
}
