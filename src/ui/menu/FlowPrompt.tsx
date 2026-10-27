import { useState } from "react";
import { cardText, scenarioText, stepText, t } from "../../content/i18n";
import type { CampaignState } from "../../engine/campaign";
import { db, gameStore, useGame } from "../state/context";
import { guideHtml } from "../game/guideText";
import { Portrait } from "../components/Portrait";
import { moment } from "../hud/SoundLayer";
import { visibleChoices } from "./campaignView";

const tr = (key: string, vars?: Record<string, string | number>) =>
  t(db, gameStore.getState().locale, key, vars);
const answer = (value: string | number | string[] | null) => {
  moment("button");
  gameStore.getState().answerFlow(value);
};
const Html = ({ text, className }: { text?: string; className?: string }) =>
  text ? <div className={className} dangerouslySetInnerHTML={{ __html: guideHtml(text) }} /> : null;

/**
 * What the campaign's flow asks the players (ADR-0011): a choice as buttons, a number, an investigator as avatars, cards
 * or a checklist to tick, a side scenario on offer, or just "Continue". The guide's own words come first.
 */
export function FlowPrompt({ campaign }: { campaign: CampaignState }) {
  const locale = useGame((s) => s.locale);
  const waiting = campaign.flow.waiting;
  const [n, setN] = useState<number | null>(null);
  const [ticked, setTicked] = useState<string[]>([]);
  if (!waiting) return null;
  const st = waiting.step;
  const words = stepText(db, campaign.campaignId, waiting.id, locale);
  const active = campaign.investigators.filter((i) => i.status === "active");
  const head = (
    <>
      {words.title && <h3 className="flow-title">{words.title}</h3>}
      <Html text={words.text} className="flow-text" />
    </>
  );
  const toggle = (id: string, max: number) =>
    setTicked((x) =>
      x.includes(id) ? x.filter((y) => y !== id) : x.length < max ? [...x, id] : x,
    );
  const confirm = (ok: boolean, value: string | number | string[] | null) => (
    <button className="primary big" disabled={!ok} onClick={() => answer(value)}>
      {tr("flow.confirm")}
    </button>
  );

  switch (st.kind) {
    case "continue":
    case "upgradeDecks":
      return (
        <div className="flow-prompt">
          <button className="primary big" onClick={() => answer("continue")}>
            {tr("flow.continue")}
          </button>
        </div>
      );
    case "unsupported":
      return (
        <div className="flow-prompt">
          {head}
          <small className="flow-unsupported">{tr("flow.unsupported")}</small>
          <button className="primary big" onClick={() => answer("continue")}>
            {tr("flow.continue")}
          </button>
        </div>
      );
    case "chooseOne":
      return (
        <div className="flow-prompt">
          {head}
          <div className="flow-choices">
            {visibleChoices(db, campaign, st.choices).map((ch) => (
              <button key={ch.id} className="flow-choice" onClick={() => answer(ch.id)}>
                <span
                  dangerouslySetInnerHTML={{ __html: guideHtml(words.choices?.[ch.id] ?? ch.text) }}
                />
              </button>
            ))}
          </div>
          {st.choices.length === 1 && (
            <button className="link-btn" onClick={() => answer(null)}>
              {tr("flow.neither")}
            </button>
          )}
        </div>
      );
    case "counter": {
      const value = n ?? st.min;
      return (
        <div className="flow-prompt">
          {head}
          <div className="flow-counter">
            <button
              aria-label={tr("flow.less")}
              disabled={value <= st.min}
              onClick={() => setN(value - 1)}
            >
              −
            </button>
            <output>{value}</output>
            <button
              aria-label={tr("flow.more")}
              disabled={st.max !== undefined && value >= st.max}
              onClick={() => setN(value + 1)}
            >
              +
            </button>
          </div>
          {confirm(true, value)}
        </div>
      );
    }
    case "investigatorChoice":
    case "investigator":
      return (
        <div className="flow-prompt">
          {st.kind === "investigatorChoice" ? (
            head
          ) : (
            <div className="flow-text">{tr("flow.whoTakes")}</div>
          )}
          <div className="flow-avatars">
            {active.map((i) => (
              <button key={i.code} className="flow-avatar" onClick={() => answer(i.code)}>
                <Portrait code={i.code} size={88} />
                <b>{cardText(db, i.code, locale).name}</b>
              </button>
            ))}
          </div>
          {st.kind === "investigatorChoice" && st.optional && (
            <button className="link-btn" onClick={() => answer(null)}>
              {tr("flow.none")}
            </button>
          )}
        </div>
      );
    case "cardChoice": {
      const codes = st.codes.length
        ? st.codes
        : [...new Set(active.flatMap((i) => i.deck))].filter(
            (c) => db.cards[c] && !db.cards[c].subtype,
          );
      return (
        <div className="flow-prompt">
          {head}
          <small>{tr("flow.pickCards", { min: st.min, max: st.max })}</small>
          <div className="flow-list">
            {codes.map((code) => (
              <label key={code} className={ticked.includes(code) ? "on" : ""}>
                <input
                  type="checkbox"
                  checked={ticked.includes(code)}
                  onChange={() => toggle(code, st.max)}
                />
                {cardText(db, code, locale).name}
              </label>
            ))}
          </div>
          {confirm(ticked.length >= st.min && ticked.length <= st.max, ticked)}
        </div>
      );
    }
    case "checklist": {
      const max = st.max ?? st.choices.length;
      return (
        <div className="flow-prompt">
          {head}
          <div className="flow-list">
            {visibleChoices(db, campaign, st.choices).map((ch) => (
              <label key={ch.id} className={ticked.includes(ch.id) ? "on" : ""}>
                <input
                  type="checkbox"
                  checked={ticked.includes(ch.id)}
                  onChange={() => toggle(ch.id, max)}
                />
                <span
                  dangerouslySetInnerHTML={{ __html: guideHtml(words.choices?.[ch.id] ?? ch.text) }}
                />
              </label>
            ))}
          </div>
          {confirm(ticked.length >= st.min && ticked.length <= max, ticked)}
        </div>
      );
    }
    case "sideScenario":
      return (
        <div className="flow-prompt">
          {head}
          <h3 className="flow-title">{tr("flow.side")}</h3>
          <div className="flow-choices">
            {st.scenarios.map((s) => {
              const can = active.every((i) => i.xp >= s.cost);
              return (
                <button
                  key={s.scenario}
                  className="flow-choice"
                  disabled={!can}
                  onClick={() => answer(s.scenario)}
                  title={
                    can
                      ? undefined
                      : tr("upgrade.cost", {
                          need: s.cost,
                          have: Math.min(...active.map((i) => i.xp)),
                        })
                  }
                >
                  <b>{scenarioText(db, s.scenario, locale).name}</b>{" "}
                  <small>{tr("flow.cost", { n: s.cost })}</small>
                </button>
              );
            })}
          </div>
          <button className="link-btn" onClick={() => answer(null)}>
            {tr("flow.decline")}
          </button>
        </div>
      );
    case "play":
      return null;
  }
}
