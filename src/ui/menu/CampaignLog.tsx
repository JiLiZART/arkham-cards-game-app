import { campaignName, cardText, logLabel, scenarioText, t } from "../../content/i18n";
import { currentScenarioId } from "../../engine/campaign";
import { db, gameStore, useGame } from "../context";

const tr = (key: string, vars?: Record<string, string | number>) => t(db, gameStore.getState().locale, key, vars);

export function CampaignLog() {
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
        <button onClick={() => gameStore.setState({ screen: "title" })}>{tr("hud.menu")}</button>
      </div>
    </div>
  );
}
