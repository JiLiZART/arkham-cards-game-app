import { useState } from "react";
import { campaignName, cardText, logLabel, scenarioText, t } from "../../content/i18n";
import { currentScenarioId } from "../../engine/campaign";
import { flatLog } from "../../engine/campaignLog";
import { db, gameStore, useGame } from "../context";
import { Portrait } from "../Portrait";
import { DeckBuilder } from "./DeckBuilder";

const tr = (key: string, vars?: Record<string, string | number>) => t(db, gameStore.getState().locale, key, vars);

/** between scenarios: what happened, the campaign log, each investigator's avatar with experience and trauma, and what comes next */
export function CampaignLog() {
  const campaign = useGame((s) => s.campaign);
  const notice = useGame((s) => s.notice);
  const locale = useGame((s) => s.locale);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  if (!campaign) return null;
  const who = upgrading ? campaign.investigators.find((i) => i.code === upgrading) : undefined;
  if (who) {
    const before: Record<string, number> = {};
    for (const c of who.deck) before[c] = (before[c] ?? 0) + 1;
    return (
      <div className="screen wizard log">
        <header className="wz-head">
          <h1>{tr("upgrade.title")}</h1>
        </header>
        <div className="wz-body">
          <DeckBuilder
            investigator={who.code}
            initial={{ id: `campaign:${who.code}`, name: cardText(db, who.code, locale).name, investigator: who.code, cards: before, randomBasicWeakness: false }}
            xp={who.xp}
            onSave={(cards) => {
              const r = gameStore.getState().upgradeDeck(who.code, cards);
              if (r.ok) {
                setUpgrading(null);
                return null;
              }
              return t(db, locale, r.reason.key, r.reason.vars);
            }}
            onCancel={() => setUpgrading(null)}
          />
        </div>
      </div>
    );
  }
  const def = db.campaigns[campaign.campaignId];
  const next = currentScenarioId(db, campaign);
  const label = (k: string) => logLabel(db, def.id, k, locale);
  return (
    <div className="screen wizard log">
      <header className="wz-head">
        <h1>
          {campaignName(db, def.id, locale)} — {campaign.result ? tr("log.summary") : tr("log.title")}
        </h1>
      </header>
      <div className="wz-body">
        {notice && <div className="notice">{notice}</div>}
        {campaign.result && <h2 className={`result-${campaign.result}`}>{tr(`result.${campaign.result}`)}</h2>}
        <section className="log-investigators">
          {campaign.investigators.map((i) => (
            <div key={i.code} className={`log-inv ${i.status !== "active" ? "out" : ""}`}>
              <Portrait code={i.code} size={72} />
              <div className="log-inv-text">
                <b>{cardText(db, i.code, locale).name}</b>
                <span className="log-stats">
                  <span>{i.xp} XP</span>
                  <span>{tr("log.physical")} {i.physicalTrauma}</span>
                  <span>{tr("log.mental")} {i.mentalTrauma}</span>
                  {i.status !== "active" && <span className="log-status">{i.status}</span>}
                </span>
                {i.status === "active" && !campaign.result && next && (
                  <button className="link-btn" onClick={() => setUpgrading(i.code)}>
                    {tr("upgrade.button")}
                  </button>
                )}
              </div>
            </div>
          ))}
        </section>
        <section>
          <h3>{tr("log.scenarios")}</h3>
          {campaign.history.map((h) => (
            <div key={h.scenarioId}>
              {scenarioText(db, h.scenarioId, locale).name}: {scenarioText(db, h.scenarioId, locale).resolution(h.resolution)?.title ?? h.resolution} · {tr("log.victory")} {h.victory} · +{h.xp} XP
            </div>
          ))}
        </section>
        <section>
          <h3>{tr("log.title")}</h3>
          {Object.entries(flatLog(campaign.log)).map(([k, v]) => (
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
      </div>
      <footer className="wz-foot">
        <button className="big" onClick={() => gameStore.setState({ screen: "title" })}>
          {tr("hud.menu")}
        </button>
        {!campaign.result && next && (
          <button className="primary big" onClick={() => gameStore.getState().startScenario()}>
            {tr("log.next")}: {scenarioText(db, next, locale).name}
          </button>
        )}
      </footer>
    </div>
  );
}
