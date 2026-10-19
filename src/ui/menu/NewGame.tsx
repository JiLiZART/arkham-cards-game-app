import { useEffect, useState } from "react";
import { moment } from "../hud/SoundLayer";
import { campaignLoaded, loadAllPacks, loadCampaign, loadPacksFor } from "../../content";
import { cardText, scenarioText, t } from "../../content/i18n";
import type { Difficulty } from "../../content/schema";
import { db, gameStore, useGame } from "../context";
import { Glyph, Icon, Stat } from "../Icon";
import { CardFace } from "../CardFace";
import { formatText } from "../hud/Hud";
import { cardImage } from "../images";
import { hasSymbol, isIcon, scenarioIcon } from "../icons";
import { Avatar } from "./Avatar";
import { BagCard } from "./BagCard";
import { deckTabs, deleteCustomDeck, editDeck, emptyDeck, problemText, renameCustomDeck } from "../decks";
import { safeStorage } from "../store";
import { DeckEditArea } from "./DeckEditArea";
import { CampaignSheet, scenarioCount } from "./CampaignSheet";
import { back, canContinue, cardsOfPicks, cycleName, picksReady, cyclesOf, deckProblems, initialWizard, investigatorInfo, next, pickerList, setCampaign, filterCampaigns, tileName, NO_CAMPAIGN_FILTER, type CampaignFilter, sortPicker, SORTS, type SortBy, setDeck, setDifficulty, STEPS, campaignComplete, toggleInvestigator, toSetup, type PickerFilter, type WizardState } from "./wizard";

const tr = (key: string, vars?: Record<string, string | number>) => t(db, gameStore.getState().locale, key, vars);
const DIFFICULTIES: Difficulty[] = ["easy", "standard", "hard", "expert"];

const KINDS = ["all", "campaign", "return", "side"] as const;
const RULES = ["all", "complete", "partial"] as const;
const LENGTHS = ["all", "one", "few", "many"] as const;

/**
 * The campaign picker: filters across the top (kind, rules, length, a name), a grid of tiles showing each campaign's first
 * scenario card, and the campaign in the sidebar with its chapters in order. The filters and the sidebar are view state
 * (ADR-0004); the pick is the wizard's. On a narrow screen the sidebar opens over the grid.
 */
function CampaignStep({ s, set }: { s: WizardState; set: (w: WizardState) => void }) {
  const locale = useGame((s) => s.locale);
  const [filter, setFilter] = useState<CampaignFilter>(NO_CAMPAIGN_FILTER);
  const [sheet, setSheet] = useState(false);
  const list = filterCampaigns(db, locale, filter);
  const chip = <K extends "kind" | "rules" | "length">(key: K, values: readonly CampaignFilter[K][]) => (
    <div className="wz-chips" role="group" aria-label={tr(`wizard.${key}.${values[0]}`)}>
      {values.map((v) => (
        <button key={v} className={`wz-chip ${filter[key] === v ? "on" : ""}`} aria-pressed={filter[key] === v} onClick={() => {
            moment("tab");
            setFilter({ ...filter, [key]: v });
          }}>
          {tr(`wizard.${key}.${v}`)}
        </button>
      ))}
    </div>
  );
  const picked = db.campaigns[s.campaignId];
  return (
    <div className={`wz-inv wz-camp ${sheet ? "sheet-open" : ""}`}>
      <div className="wz-inv-main">
        <p className="wz-hint">{tr("wizard.campaign.hint")}</p>
        <div className="wz-filters">
          {chip("kind", KINDS)}
          {chip("rules", RULES)}
          {chip("length", LENGTHS)}
          <input type="search" placeholder={tr("wizard.filter.search")} aria-label={tr("wizard.filter.search")} value={filter.query} onChange={(e) => setFilter({ ...filter, query: e.target.value })} />
        </div>
        {list.length === 0 && <p className="wz-hint">{tr("wizard.noCampaigns")}</p>}
        <div className="wz-ctiles">
          {list.map((c) => {
            // the first chapter's art (the first agenda), found by code: a generated campaign's cards load only when it is chosen
            const card = c.cover ?? db.scenarios[c.scenarios[0]]?.agendas[0] ?? c.card;
            const art = card ? (db.cards[card] ?? { code: card }) : null;
            const on = s.campaignId === c.id;
            return (
              <button
                key={c.id}
                className={`wz-ctile ${on ? "selected" : ""}`}
                aria-pressed={on}
                onClick={() => {
                  moment("tab");
                  set(setCampaign(s, c.id, db));
                  setSheet(true);
                }}
              >
                {art && <img src={cardImage(art, "front", locale) ?? ""} alt="" loading="lazy" draggable={false} onError={(e) => (e.currentTarget.style.display = "none")} />}
                <b>{tileName(db, c, locale)}</b>
                <small>
                  {scenarioCount(c.scenarios.length)}
                  {!campaignComplete(db, c.id) && <span title={tr("wizard.generated")}> ◐</span>}
                </small>
              </button>
            );
          })}
        </div>
      </div>
      {picked && (
        <div className="wz-inv-side wz-camp-side" aria-live="polite">
          <CampaignSheet key={picked.id} campaign={picked} onClose={() => setSheet(false)} />
        </div>
      )}
    </div>
  );
}

const CLASSES = ["guardian", "seeker", "rogue", "mystic", "survivor", "neutral"] as const;

/** the investigator in the sidebar: the full card, the starting stats, the ability and the deckbuilding rules */
function InvestigatorSheet({ code }: { code: string }) {
  const locale = useGame((s) => s.locale);
  const info = investigatorInfo(db, code, locale);
  const card = db.cards[code];
  const inv = db.investigators[code];
  const tx = card ? cardText(db, code, locale) : null;
  return (
    <div className="wz-sheet">
      <div className="wz-sheet-head">
        {isIcon(info.faction) && <Icon name={info.faction} size={30} />}
        <div>
          <b>{info.name}</b>
          {info.subname && <i>{info.subname}</i>}
        </div>
      </div>
      <div className="wz-sheet-card">
        <CardFace code={code} locale={locale} remote />
      </div>
      {card ? (
        <>
          <div className="wz-sheet-stats">
            <Stat icon="health" value={card.health ?? "–"} size={30} label={tr("stat.health")} />
            <Stat icon="sanity" value={card.sanity ?? "–"} size={30} label={tr("stat.sanity")} />
            {(["willpower", "intellect", "combat", "agility"] as const).map((k) => (
              <Stat key={k} icon={k} value={card.skills?.[k] ?? "–"} size={28} label={tr(`stat.${k}`)} />
            ))}
          </div>
          {tx?.traits?.length ? <div className="wz-sheet-traits">{tx.traits.map((t) => `${t}.`).join(" ")}</div> : null}
          {tx?.text && <p className="wz-sheet-text" dangerouslySetInnerHTML={{ __html: formatText(tx.text) }} />}
          {tx?.backText && <p className="wz-sheet-text wz-sheet-back" dangerouslySetInnerHTML={{ __html: formatText(tx.backText) }} />}
        </>
      ) : (
        <p className="wz-hint">{tr("wizard.loading")}</p>
      )}
      <small className="wz-sheet-meta">
        {cycleName(db, locale, info.pack || "core")}
        {inv ? ` · ${tr("wizard.deckSize", { n: inv.deckSize })}` : ""}
      </small>
    </div>
  );
}

function InvestigatorsStep({ s, set }: { s: WizardState; set: (w: WizardState) => void }) {
  const locale = useGame((s) => s.locale);
  // filters, the order and the investigator in the sidebar are view state (ADR-0004): they are not part of the picks
  const [filter, setFilter] = useState<PickerFilter>({ faction: null, cycle: null, query: "" });
  const [sort, setSort] = useState<SortBy>("release");
  const [focus, setFocus] = useState<string | null>(null);
  // every investigator's card (stats, ability, the language's text) comes with the packs: all of them, once
  const [, loaded] = useState(0);
  useEffect(() => {
    let live = true;
    loadAllPacks()
      .then(() => live && loaded((n) => n + 1))
      .catch((e) => console.error(e));
    return () => {
      live = false;
    };
  }, []);
  const list = sortPicker(db, pickerList(db, locale, filter), sort);
  const shown = focus ?? s.picks.at(-1) ?? list[0]?.code ?? null;
  return (
    <div className="wz-inv">
      <div className="wz-inv-main">
        <p className="wz-hint">{tr("wizard.investigators.hint")}</p>
        <div className="wz-filters">
          <div className="wz-chips" role="group" aria-label={tr("wizard.filter.class")}>
            {CLASSES.map((c) => (
              <button
                key={c}
                className={`wz-chip wz-class ${filter.faction === c ? "on" : ""}`}
                aria-pressed={filter.faction === c}
                title={tr(`card.faction.${c}`)}
                onClick={() => setFilter({ ...filter, faction: filter.faction === c ? null : c })}
              >
                <Icon name={c} size={24} title={tr(`card.faction.${c}`)} />
              </button>
            ))}
          </div>
          <select aria-label={tr("wizard.filter.cycle")} value={filter.cycle ?? ""} onChange={(e) => setFilter({ ...filter, cycle: e.target.value || null })}>
            <option value="">{tr("wizard.filter.allCycles")}</option>
            {cyclesOf(db).map((p) => (
              <option key={p} value={p}>
                {cycleName(db, locale, p)}
              </option>
            ))}
          </select>
          <label className="wz-sort">
            <span>{tr("wizard.sort")}</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortBy)}>
              {SORTS.map((k) => (
                <option key={k} value={k}>
                  {tr(`wizard.sort.${k}`)}
                </option>
              ))}
            </select>
          </label>
          <input type="search" placeholder={tr("wizard.filter.search")} aria-label={tr("wizard.filter.search")} value={filter.query} onChange={(e) => setFilter({ ...filter, query: e.target.value })} />
        </div>
        {!list.length && <p className="wz-hint">{tr("wizard.noMatch")}</p>}
        <div className="wz-tiles">
          {list.map((i) => {
            const k = s.picks.indexOf(i.code);
            return (
              <button
                key={i.code}
                className={`wz-tile ${k >= 0 ? "selected" : ""} ${i.needsDeck ? "needs-deck" : ""} ${shown === i.code ? "focused" : ""}`}
                aria-pressed={k >= 0}
                disabled={i.needsDeck && k < 0}
                onMouseEnter={() => setFocus(i.code)}
                onFocus={() => setFocus(i.code)}
                onClick={() => {
                  setFocus(i.code);
                  set(toggleInvestigator(db, s, i.code));
                }}
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
      </div>
      {shown && (
        <aside className="wz-inv-side" aria-live="polite">
          <InvestigatorSheet key={shown} code={shown} />
        </aside>
      )}
    </div>
  );
}

/**
 * The deck step: the picked investigators as avatars (a click switches to one), then their decks as tabs like a browser's
 * (the starter decks, the saved ones, "+" for a new deck), then the chosen deck's editing area. The tab on show is the
 * deck that investigator brings. An edit of a starter deck becomes a new saved deck; a saved deck is kept as it is edited.
 */
function DecksStep({ s, set }: { s: WizardState; set: (w: WizardState) => void }) {
  const locale = useGame((s) => s.locale);
  const [active, setActive] = useState(s.picks[0]);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  // saved decks change under us (an edit, a rename, a delete): re-read them on every change
  const [, bump] = useState(0);
  // the pool needs every pack's cards (the investigator step started loading them)
  useEffect(() => {
    let live = true;
    loadAllPacks()
      .then(() => live && bump((n) => n + 1))
      .catch((e) => console.error(e));
    return () => {
      live = false;
    };
  }, []);
  if (!picksReady(db, s)) return <p className="wz-hint" role="status">{tr("wizard.loading")}</p>;
  const code = s.picks.includes(active) ? active : s.picks[0];
  const tabs = deckTabs(db, code);
  const tab = tabs.find((x) => x.id === s.decks[code]) ?? tabs[0];
  const choose = (id: string) => set(setDeck(s, code, id));
  const edit = (cards: Record<string, number>, random: boolean) => {
    const id = editDeck(db, safeStorage(), code, tab.deck, cards, locale, random);
    if (id !== tab.id) choose(id);
    bump((n) => n + 1);
  };
  const addTab = () => {
    const empty = emptyDeck(db, code);
    choose(editDeck(db, safeStorage(), code, empty, empty.cards, locale, true));
    bump((n) => n + 1);
  };
  return (
    <div className="dk">
      <div className="dk-invs" role="tablist" aria-label={tr("wizard.decks.title")}>
        {s.picks.map((c, k) => {
          const problems = deckProblems(db, s, c);
          return (
            <button key={c} role="tab" aria-selected={c === code} className={`dk-inv ${c === code ? "on" : ""}`} onClick={() => {
              moment("tab");
              setActive(c);
            }}>
              <Avatar code={c} size={56} badge={`P${k + 1}`} />
              <small className={problems.length ? "bad" : "ok"}>{problems.length ? tr("deck.toFix", { n: problems.length }) : tr("deck.ready")}</small>
            </button>
          );
        })}
      </div>
      <div className="dk-tabs" role="tablist">
        {tabs.map((x) => (
          <div key={x.id} className={`dk-tab ${x.id === tab?.id ? "on" : ""} ${x.problems.length ? "bad" : ""}`} role="tab" aria-selected={x.id === tab?.id}>
            {renaming?.id === x.id ? (
              <input
                autoFocus
                className="dk-rename"
                value={renaming.name}
                maxLength={40}
                aria-label={tr("deckEditor.name")}
                onChange={(e) => setRenaming({ id: x.id, name: e.target.value })}
                onBlur={() => setRenaming(null)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && renaming.name.trim()) {
                    renameCustomDeck(safeStorage(), x.id, renaming.name.trim());
                    setRenaming(null);
                    bump((n) => n + 1);
                  }
                  if (e.key === "Escape") setRenaming(null);
                }}
              />
            ) : (
              <button className="dk-tab-name" onClick={() => {
                moment("tab");
                choose(x.id);
              }} onDoubleClick={() => x.kind === "custom" && setRenaming({ id: x.id, name: x.name })} title={x.kind === "custom" ? tr("deck.renameHint") : undefined}>
                {x.problems.length ? "⚠ " : ""}
                {x.name}
              </button>
            )}
            {x.kind === "custom" && (
              <button
                className={`dk-tab-close ${deleting === x.id ? "confirm" : ""}`}
                aria-label={tr("deckEditor.delete")}
                title={deleting === x.id ? tr("deckEditor.confirmDelete") : tr("deckEditor.delete")}
                onBlur={() => setDeleting(null)}
                onClick={() => {
                  if (deleting !== x.id) return setDeleting(x.id);
                  deleteCustomDeck(safeStorage(), x.id);
                  setDeleting(null);
                  if (tab?.id === x.id) choose(tabs[0].id);
                  bump((n) => n + 1);
                }}
              >
                {deleting === x.id ? "✓" : "×"}
              </button>
            )}
          </div>
        ))}
        <button className="dk-tab dk-tab-add" onClick={addTab} title={tr("deck.newTab")} aria-label={tr("deck.newTab")}>
          +
        </button>
      </div>
      {tab && tab.problems.length > 0 && (
        <div className="problems dk-problems" role="status">
          {tab.problems.slice(0, 4).map((p, k) => (
            <div key={k}>{problemText(db, locale, p)}</div>
          ))}
        </div>
      )}
      {tab && <DeckEditArea key={`${code}:${tab.id}`} investigator={code} deck={tab.deck} onChange={edit} />}
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
  // the picked investigators' decks of later cycles: their packs load as soon as they are picked, so the deck step can check them
  const picks = s.picks.join(",");
  useEffect(() => {
    if (picksReady(db, s)) return;
    let live = true;
    loadPacksFor(cardsOfPicks(db, s))
      .then(() => live && loaded((n) => n + 1))
      .catch((e) => console.error(e));
    return () => {
      live = false;
    };
  }, [picks]);
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
