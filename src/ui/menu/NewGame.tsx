import { useEffect, useState } from "react";
import { campaignLoaded, loadCampaign } from "../../content";
import { campaignBlurb, campaignName, scenarioText, t } from "../../content/i18n";
import type { Difficulty } from "../../content/schema";
import { db, gameStore, useGame } from "../context";
import { Glyph } from "../Icon";
import { cardImage } from "../images";
import { hasSymbol, scenarioIcon } from "../icons";
import { Avatar } from "./Avatar";
import { BagCard } from "./BagCard";
import { customDecks, deleteCustomDeck, problemText, renameCustomDeck, type DeckOp } from "../decks";
import { safeStorage } from "../store";
import { DeckEditor } from "./DeckEditor";
import { blurb } from "./blurb";
import { back, campaignOrder, canContinue, cycleName, cyclesOf, deckProblems, decksFor, initialWizard, invalidDecksFor, next, pickerList, setCampaign, setDeck, setDifficulty, STEPS, toggleInvestigator, toSetup, type PickerFilter, type WizardState } from "./wizard";

const tr = (key: string, vars?: Record<string, string | number>) => t(db, gameStore.getState().locale, key, vars);
const DIFFICULTIES: Difficulty[] = ["easy", "standard", "hard", "expert"];

function CampaignStep({ s, set }: { s: WizardState; set: (w: WizardState) => void }) {
  const locale = useGame((s) => s.locale);
  const campaigns = campaignOrder(db);
  // the tile whose whole prologue is open ("More"); a tap there never picks the campaign
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="wz-campaigns">
      {campaigns.map((c) => {
        const first = db.scenarios[c.scenarios[0]];
        // a generated campaign's scenarios and cards load when it is chosen: its reference card's scan is found by code
        const card = first?.card ?? c.card;
        const art = card ? (db.cards[card] ?? { code: card }) : null;
        const { prologue, scenarios } = campaignBlurb(db, c.id, locale);
        const { lead, more } = blurb(prologue);
        const picked = s.campaignId === c.id;
        // an epigraph is set in italics: it opens with a quotation mark
        const quote = /^[“"«„]/.test(lead);
        return (
          <div key={c.id} className={`wz-campaign ${picked ? "selected" : ""}`}>
            <button className="wz-pick" aria-pressed={picked} onClick={() => set(setCampaign(s, c.id, db))}>
              {art && <img src={cardImage(art, "front", locale) ?? ""} alt="" draggable={false} onError={(e) => (e.currentTarget.style.display = "none")} />}
              <span className="wz-text">
                <b>{campaignName(db, c.id, locale)}</b>
                <small className="wz-count">{tr("wizard.scenarios", { n: c.scenarios.length })}</small>
                {c.generated && <small className="wz-generated">{tr("wizard.generated")}</small>}
                {lead && <small className={`wz-lead ${quote ? "quote" : ""}`}>{lead}</small>}
                {scenarios.length > 1 && <small className="wz-scenarios">{scenarios.join(" · ")}</small>}
              </span>
            </button>
            {more && (
              <>
                {open === c.id && <small className="wz-more-text">{more}</small>}
                <button className="link-btn wz-more" aria-expanded={open === c.id} onClick={() => setOpen(open === c.id ? null : c.id)}>
                  {tr(open === c.id ? "wizard.less" : "wizard.more")}
                </button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

const CLASSES = ["guardian", "seeker", "rogue", "mystic", "survivor", "neutral"];

function InvestigatorsStep({ s, set }: { s: WizardState; set: (w: WizardState) => void }) {
  const locale = useGame((s) => s.locale);
  // filters are view state (ADR-0004): they are not part of the picks
  const [filter, setFilter] = useState<PickerFilter>({ faction: null, cycle: null, query: "" });
  const list = pickerList(db, locale, filter);
  return (
    <>
      <p className="wz-hint">{tr("wizard.investigators.hint")}</p>
      <div className="wz-filters">
        <div className="wz-chips" role="group" aria-label={tr("wizard.filter.class")}>
          {CLASSES.map((c) => (
            <button key={c} className={`wz-chip ${filter.faction === c ? "on" : ""}`} aria-pressed={filter.faction === c} onClick={() => setFilter({ ...filter, faction: filter.faction === c ? null : c })}>
              {tr(`card.faction.${c}`)}
            </button>
          ))}
        </div>
        <select aria-label={tr("wizard.filter.cycle")} value={filter.cycle ?? ""} onChange={(e) => setFilter({ ...filter, cycle: e.target.value || null })}>
          <option value="">{tr("wizard.filter.all")}</option>
          {cyclesOf(db).map((p) => (
            <option key={p} value={p}>
              {cycleName(db, locale, p)}
            </option>
          ))}
        </select>
        <input type="search" placeholder={tr("wizard.filter.search")} aria-label={tr("wizard.filter.search")} value={filter.query} onChange={(e) => setFilter({ ...filter, query: e.target.value })} />
      </div>
      {!list.length && <p className="wz-hint">{tr("wizard.noMatch")}</p>}
      <div className="wz-tiles">
        {list.map((i) => {
          const k = s.picks.indexOf(i.code);
          return (
            <button
              key={i.code}
              className={`wz-tile ${k >= 0 ? "selected" : ""} ${i.needsDeck ? "needs-deck" : ""}`}
              aria-pressed={k >= 0}
              disabled={i.needsDeck && k < 0}
              onClick={() => set(toggleInvestigator(db, s, i.code))}
            >
              <Avatar code={i.code} badge={k >= 0 ? `P${k + 1}` : undefined}>
                {i.needsDeck && <small className="wz-note">{tr("wizard.needsDeck")}</small>}
                {i.partlyImplemented && !i.needsDeck && (
                  <small className="wz-note" title={tr("wizard.partly")}>
                    ◐ {tr("wizard.partlyShort")}
                  </small>
                )}
              </Avatar>
            </button>
          );
        })}
      </div>
    </>
  );
}

function DecksStep({ s, set }: { s: WizardState; set: (w: WizardState) => void }) {
  const locale = useGame((s) => s.locale);
  const [editing, setEditing] = useState<{ code: string; base: string; ops: DeckOp[]; name?: string } | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  // saved decks change under us (rename, delete, save): re-read them on every render
  const [, bump] = useState(0);
  if (editing)
    return (
      <DeckEditor
        investigator={editing.code}
        baseId={editing.base}
        initialOps={editing.ops}
        initialName={editing.name}
        onCancel={() => setEditing(null)}
        onSave={(d) => {
          setEditing(null);
          set(setDeck(s, editing.code, d.id));
        }}
      />
    );
  return (
    <div className="wz-decks">
      {s.picks.map((code, k) => {
        const problems = deckProblems(db, s, code);
        const saved = customDecks(db, code);
        const chosen = s.decks[code];
        const mine = saved.find((d) => d.id === chosen);
        return (
          <section key={code} className="wz-deck-row">
            <Avatar code={code} size={64} badge={`P${k + 1}`} />
            <div className="wz-deck-cards">
              {decksFor(db, code).map((d) => {
                const custom = saved.find((x) => x.id === d.id);
                return (
                  <div key={d.id} className="wz-deck-wrap">
                    {renaming?.id === d.id ? (
                      <div className="wz-deck selected">
                        <input
                          autoFocus
                          className="wz-rename"
                          value={renaming.name}
                          maxLength={40}
                          aria-label={tr("deckEditor.name")}
                          onChange={(e) => setRenaming({ id: d.id, name: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && renaming.name.trim()) {
                              renameCustomDeck(safeStorage(), d.id, renaming.name.trim());
                              setRenaming(null);
                            }
                            if (e.key === "Escape") setRenaming(null);
                          }}
                        />
                      </div>
                    ) : (
                      <button className={`wz-deck ${chosen === d.id ? "selected" : ""}`} aria-pressed={chosen === d.id} onClick={() => set(setDeck(s, code, d.id))}>
                        <b>{d.name}</b>
                        <small>
                          {tr("wizard.deckSize", { n: Object.values(d.cards).reduce((a, b) => a + b, 0) })}
                          {custom ? ` · ${tr("deckEditor.custom")}` : ""}
                        </small>
                      </button>
                    )}
                    {custom && (
                      <span className="wz-deck-tools">
                        {renaming?.id === d.id ? (
                          <button
                            disabled={!renaming.name.trim()}
                            onClick={() => {
                              renameCustomDeck(safeStorage(), d.id, renaming.name.trim());
                              setRenaming(null);
                            }}
                          >
                            {tr("deckEditor.ok")}
                          </button>
                        ) : (
                          <button onClick={() => setRenaming({ id: d.id, name: d.name })}>{tr("deckEditor.rename")}</button>
                        )}
                        {deleting === d.id ? (
                          <>
                            <button
                              className="danger"
                              onClick={() => {
                                deleteCustomDeck(safeStorage(), d.id);
                                setDeleting(null);
                                set(setDeck(s, code, Object.values(db.decks).find((x) => x.investigator === code)?.id ?? ""));
                                bump((n) => n + 1);
                              }}
                            >
                              {tr("deckEditor.confirmDelete")}
                            </button>
                            <button onClick={() => setDeleting(null)}>{tr("deckEditor.cancel")}</button>
                          </>
                        ) : (
                          <button onClick={() => setDeleting(d.id)}>{tr("deckEditor.delete")}</button>
                        )}
                      </span>
                    )}
                  </div>
                );
              })}
              {invalidDecksFor(db, code).map((d) => (
                <div key={d.id} className="wz-deck-wrap">
                  <button className="wz-deck invalid" disabled>
                    <b>{d.name}</b>
                    <small>{d.problems.map((p) => problemText(db, locale, p)).join(" · ")}</small>
                  </button>
                  <span className="wz-deck-tools">
                    <button onClick={() => { deleteCustomDeck(safeStorage(), d.id); bump((n) => n + 1); }}>{tr("deckEditor.delete")}</button>
                  </span>
                </div>
              ))}
              <button
                className="wz-edit"
                onClick={() => setEditing({ code, base: mine?.base ?? chosen, ops: mine?.ops ?? [], name: mine?.name })}
                disabled={!chosen || !(mine ? db.decks[mine.base] : db.decks[chosen])}
              >
                {tr("deckEditor.edit")}
              </button>
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
  const loading = useGame((s) => s.loading);
  const error = useGame((s) => s.error);
  const [s, set] = useState<WizardState>(() => initialWizard(db));
  // a generated campaign's scenarios come in when it is picked (its first scenario's name and intro, the ready step)
  const [, loaded] = useState(0);
  useEffect(() => {
    if (!campaignLoaded(s.campaignId))
      loadCampaign(s.campaignId)
        .then(() => loaded((n) => n + 1))
        .catch((e) => console.error(e));
  }, [s.campaignId]);
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
        {error && <span className="wz-error">{error}</span>}
        {last ? (
          <button className="primary big" disabled={loading} onClick={() => gameStore.getState().newCampaign(toSetup(s, Date.now() >>> 0, db))}>
            {tr(loading ? "wizard.loading" : "wizard.begin")}
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
