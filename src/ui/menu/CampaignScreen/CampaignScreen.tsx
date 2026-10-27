import { useState } from "react";
import {
  campaignName,
  cardText,
  interludeName,
  logLabel,
  scenarioText,
  t,
} from "../../../content/i18n";
import { currentScenarioId } from "../../../engine/campaign";
import { db, gameStore, useGame } from "../../state/context";
import { guideHtml } from "../../game/guideText";
import { Portrait } from "../../components/Portrait/index";
import { logView, readItems } from "../campaignView";
import { DeckBuilder } from "../DeckBuilder";
import { FlowPrompt } from "../FlowPrompt";
import { cx } from "../../components/cx";
import styles from "./CampaignScreen.module.css";

const tr = (key: string, vars?: Record<string, string | number>) =>
  t(db, gameStore.getState().locale, key, vars);

/**
 * The campaign between scenarios: the guide read out (stories, what was recorded), the prompt the flow waits at, each
 * investigator's avatar with experience and trauma and the deck upgrade, the campaign log in its sections, and what comes next.
 */
export function CampaignScreen() {
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
            initial={{
              id: `campaign:${who.code}`,
              name: cardText(db, who.code, locale).name,
              investigator: who.code,
              cards: before,
              randomBasicWeakness: false,
            }}
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
  const waiting = campaign.flow.waiting?.step.kind;
  // the deck upgrade is offered where the guide offers it, and before a scenario begins
  const mayUpgrade = !campaign.result && (waiting === "upgradeDecks" || waiting === "play");
  const read = readItems(db, campaign, locale);
  const item = campaign.flow.item
    ? interludeName(db, def.id, campaign.flow.item, locale)
    : undefined;
  return (
    <div className="screen wizard log">
      <header className="wz-head">
        <h1>
          {campaignName(db, def.id, locale)} —{" "}
          {campaign.result ? tr("log.summary") : (item ?? tr("log.title"))}
        </h1>
      </header>
      <div className="wz-body">
        {notice && <div className={styles.notice}>{notice}</div>}
        {campaign.result && (
          <h2 className={styles[`result-${campaign.result}`]}>{tr(`result.${campaign.result}`)}</h2>
        )}
        {read.length > 0 && (
          <section className={styles.flowRead} aria-live="polite">
            {read.map((r, k) =>
              r.kind === "story" ? (
                <div key={k} className={styles.flowStory}>
                  {r.title && <h3 className="flow-title">{r.title}</h3>}
                  {r.text && (
                    <div
                      className="flow-text"
                      dangerouslySetInnerHTML={{ __html: guideHtml(r.text) }}
                    />
                  )}
                </div>
              ) : (
                <div key={k} className={styles.flowRecorded}>
                  <small>{tr("flow.recorded")}</small> {r.label}
                </div>
              ),
            )}
          </section>
        )}
        {!campaign.result && <FlowPrompt campaign={campaign} />}
        <section className={styles.logInvestigators}>
          {campaign.investigators.map((i) => (
            <div key={i.code} className={cx("log-inv", i.status !== "active" ? styles.out : "")}>
              <Portrait code={i.code} size={72} />
              <div className={styles.logInvText}>
                <b>{cardText(db, i.code, locale).name}</b>
                <span className={styles.logStats}>
                  <span>{i.xp} XP</span>
                  <span>
                    {tr("log.physical")} {i.physicalTrauma}
                  </span>
                  <span>
                    {tr("log.mental")} {i.mentalTrauma}
                  </span>
                  {i.status !== "active" && <span className={styles.logStatus}>{i.status}</span>}
                </span>
                {i.status === "active" && mayUpgrade && (
                  <button className="link-btn" onClick={() => setUpgrading(i.code)}>
                    {tr("upgrade.button")}
                  </button>
                )}
              </div>
            </div>
          ))}
        </section>
        {campaign.history.length > 0 && (
          <section>
            <h3>{tr("log.scenarios")}</h3>
            {campaign.history.map((h, k) => (
              <div key={k}>
                {scenarioText(db, h.scenarioId, locale).name}:{" "}
                {scenarioText(db, h.scenarioId, locale).resolution(h.resolution)?.title ??
                  h.resolution}{" "}
                · {tr("log.victory")} {h.victory} · +{h.xp} XP
              </div>
            ))}
          </section>
        )}
        {logView(db, campaign, locale).map((sec) => (
          <section key={sec.id} className="log-section">
            <h3>{sec.id === "campaign_notes" ? tr("log.title") : sec.label}</h3>
            {sec.entries.map((e) => (
              <div key={e.id} className={e.crossedOut ? styles.logCrossed : ""}>
                {e.label}
              </div>
            ))}
            {sec.counts.map((n) => (
              <div key={n.id}>
                <b>
                  {sec.counts.length === 1 && sec.entries.length === 0
                    ? sec.label
                    : logLabel(db, def.id, n.id, locale)}
                  :
                </b>{" "}
                {n.n}
              </div>
            ))}
            {sec.cards.map((l) => (
              <div key={l.id}>
                <b>{logLabel(db, def.id, l.id, locale)}:</b>{" "}
                {l.codes.map((c) => cardText(db, c, locale).name).join(", ")}
              </div>
            ))}
            {sec.investigators.map((x) => (
              <div key={x.id}>
                <b>{logLabel(db, def.id, x.id, locale)}:</b>{" "}
                {x.byInvestigator
                  .map((b) => `${cardText(db, b.code, locale).name} ${b.n}`)
                  .join(", ")}
              </div>
            ))}
          </section>
        ))}
      </div>
      <footer className="wz-foot">
        <button className="big" onClick={() => gameStore.setState({ screen: "title" })}>
          {tr("hud.menu")}
        </button>
        {!campaign.result && waiting === "play" && next && (
          <button className="primary big" onClick={() => gameStore.getState().startScenario()}>
            {tr("log.next")}: {scenarioText(db, next, locale).name}
          </button>
        )}
      </footer>
    </div>
  );
}
