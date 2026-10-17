import { useState } from "react";
import { campaignName, scenarioText, t } from "../../content/i18n";
import type { Difficulty } from "../../content/schema";
import { db, gameStore, useGame } from "../context";
import { Glyph } from "../Icon";
import { cardImage } from "../images";
import { hasSymbol, scenarioIcon } from "../icons";
import { Avatar } from "./Avatar";
import { BagCard } from "./BagCard";
import { back, canContinue, deckProblems, decksFor, initialWizard, next, setCampaign, setDeck, setDifficulty, STEPS, toggleInvestigator, toSetup, type WizardState } from "./wizard";

const tr = (key: string, vars?: Record<string, string | number>) => t(db, gameStore.getState().locale, key, vars);
const DIFFICULTIES: Difficulty[] = ["easy", "standard", "hard", "expert"];

function CampaignStep({ s, set }: { s: WizardState; set: (w: WizardState) => void }) {
  const locale = useGame((s) => s.locale);
  const campaigns = Object.values(db.campaigns);
  return (
    <div className="wz-campaigns">
      {campaigns.map((c) => {
        const first = db.scenarios[c.scenarios[0]];
        const art = first ? db.cards[first.card] : null;
        return (
          <button key={c.id} className={`wz-campaign ${s.campaignId === c.id ? "selected" : ""}`} aria-pressed={s.campaignId === c.id} onClick={() => set(setCampaign(s, c.id, db))}>
            {art && <img src={cardImage(art, "front", locale) ?? ""} alt="" draggable={false} onError={(e) => (e.currentTarget.style.display = "none")} />}
            <b>{campaignName(db, c.id, locale)}</b>
            <small>{first ? scenarioText(db, first.id, locale).intro : ""}</small>
          </button>
        );
      })}
    </div>
  );
}

function InvestigatorsStep({ s, set }: { s: WizardState; set: (w: WizardState) => void }) {
  return (
    <>
      <p className="wz-hint">{tr("wizard.investigators.hint")}</p>
      <div className="wz-tiles">
        {Object.values(db.investigators).map((i) => {
          const k = s.picks.indexOf(i.code);
          return (
            <button key={i.code} className={`wz-tile ${k >= 0 ? "selected" : ""}`} aria-pressed={k >= 0} onClick={() => set(toggleInvestigator(db, s, i.code))}>
              <Avatar code={i.code} badge={k >= 0 ? `P${k + 1}` : undefined} />
            </button>
          );
        })}
      </div>
    </>
  );
}

function DecksStep({ s, set }: { s: WizardState; set: (w: WizardState) => void }) {
  return (
    <div className="wz-decks">
      {s.picks.map((code, k) => {
        const problems = deckProblems(db, s, code);
        return (
          <section key={code} className="wz-deck-row">
            <Avatar code={code} size={64} badge={`P${k + 1}`} />
            <div className="wz-deck-cards">
              {decksFor(db, code).map((d) => (
                <button key={d.id} className={`wz-deck ${s.decks[code] === d.id ? "selected" : ""}`} aria-pressed={s.decks[code] === d.id} onClick={() => set(setDeck(s, code, d.id))}>
                  <b>{d.name}</b>
                  <small>{tr("wizard.deckSize", { n: Object.values(d.cards).reduce((a, b) => a + b, 0) })}</small>
                </button>
              ))}
              {problems.length > 0 && <div className="problems">{problems.join(" · ")}</div>}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function DifficultyStep({ s, set }: { s: WizardState; set: (w: WizardState) => void }) {
  const bags = db.campaigns[s.campaignId]?.chaosBags ?? {};
  return (
    <div className="wz-bags">
      {DIFFICULTIES.filter((d) => bags[d]).map((d) => (
        <BagCard key={d} bag={bags[d]!} difficulty={d} selected={s.difficulty === d} onSelect={() => set(setDifficulty(s, d, db))} />
      ))}
    </div>
  );
}

function ReadyStep({ s }: { s: WizardState }) {
  const locale = useGame((s) => s.locale);
  const c = db.campaigns[s.campaignId];
  const first = c.scenarios[0];
  const icon = scenarioIcon(first);
  return (
    <div className="wz-ready">
      <div className="wz-order">
        {s.picks.map((code, k) => (
          <Avatar key={code} code={code} badge={`P${k + 1}`} />
        ))}
      </div>
      <BagCard bag={c.chaosBags[s.difficulty] ?? []} difficulty={s.difficulty} selected />
      <div className="wz-first">
        <small>{tr("wizard.firstScenario")}</small>
        <b>
          {hasSymbol(icon) && <Glyph name={icon} size={26} title="" />} {scenarioText(db, first, locale).name}
        </b>
      </div>
    </div>
  );
}

/** the new-campaign wizard: one decision a screen, Back on every step, the picks kept */
export function Wizard() {
  useGame((s) => s.locale);
  const [s, set] = useState<WizardState>(() => initialWizard(db));
  const at = STEPS.indexOf(s.step);
  const last = at === STEPS.length - 1;
  return (
    <div className="screen wizard">
      <header className="wz-head">
        <h1>{tr(`wizard.${s.step}.title`)}</h1>
        <div className="wz-dots" aria-hidden="true">
          {STEPS.map((x, k) => (
            <i key={x} className={k === at ? "on" : k < at ? "done" : ""} />
          ))}
        </div>
      </header>
      <div className="wz-body">
        {s.step === "campaign" && <CampaignStep s={s} set={set} />}
        {s.step === "investigators" && <InvestigatorsStep s={s} set={set} />}
        {s.step === "decks" && <DecksStep s={s} set={set} />}
        {s.step === "difficulty" && <DifficultyStep s={s} set={set} />}
        {s.step === "ready" && <ReadyStep s={s} />}
      </div>
      <footer className="wz-foot">
        <button className="big" onClick={() => (at === 0 ? gameStore.setState({ screen: "title" }) : set(back(s)))}>
          {tr("wizard.back")}
        </button>
        {last ? (
          <button className="primary big" onClick={() => gameStore.getState().newCampaign(toSetup(s, Date.now() >>> 0))}>
            {tr("wizard.begin")}
          </button>
        ) : (
          <button className="primary big" disabled={!canContinue(db, s)} onClick={() => set(next(db, s))}>
            {tr("wizard.next")}
          </button>
        )}
      </footer>
    </div>
  );
}
