import { useEffect, useState } from "react";
import { FilterToolbar } from "../FilterToolbar";
import { FilterChips } from "../FilterPanel";
import { useWizardFilters } from "../wizardFilters";
import { moment } from "../../hud/SoundLayer";
import { campaignLoaded, loadAllPacks, loadCampaign, loadPacksFor } from "../../../content";
import { cardText, scenarioText, t } from "../../../content/i18n";
import type { Difficulty } from "../../../content/schema";
import { db, gameStore, useGame } from "../../state/context";
import { Glyph, Icon, Stat, UiIcon } from "../../components/Icon";
import { CardFace } from "../../components/CardFace";
import { formatText } from "../../hud/Hud";
import { cardImage } from "../../assets/images";
import { hasSymbol, isIcon, scenarioIcon } from "../../assets/icons";
import { Avatar } from "../Avatar";
import { BagCard } from "../BagCard";
import {
  deckTabs,
  deleteCustomDeck,
  editDeck,
  emptyDeck,
  problemText,
  renameCustomDeck,
} from "../../game/decks";
import { safeStorage } from "../../state/store";
import { DeckEditArea } from "../DeckEditArea";
import { CampaignSheet, scenarioCount } from "../CampaignSheet";
import {
  back,
  canContinue,
  cardsOfPicks,
  cycleName,
  picksReady,
  cyclesOf,
  deckProblems,
  initialWizard,
  investigatorInfo,
  next,
  pickerList,
  setCampaign,
  filterCampaigns,
  tileName,
  campaignPills,
  pickerPills,
  STAT_KEYS,
  type StatKey,
  sortPicker,
  SORTS,
  type SortBy,
  setDeck,
  setDifficulty,
  STEPS,
  campaignComplete,
  campaignFilterCount,
  campaignOrder,
  pickerFilterCount,
  toggleInvestigator,
  toSetup,
  type WizardState,
} from "../wizard";
import { cx } from "../../components/cx";
import { BottomSheet } from "../../components/BottomSheet";
import { useLayoutMode } from "../../state/layoutMode";
import styles from "./NewGame.module.css";

const tr = (key: string, vars?: Record<string, string | number>) =>
  t(db, gameStore.getState().locale, key, vars);
const DIFFICULTIES: Difficulty[] = ["easy", "standard", "hard", "expert"];

const KINDS = ["campaign", "return", "side"] as const;
const RULES = ["complete", "partial"] as const;
const LENGTHS = ["one", "few", "many"] as const;
/** the stat minimums offered: the printed ranges of the investigators' skills, health and sanity */
const MINS: Record<StatKey, number[]> = {
  health: [7, 8, 9],
  sanity: [7, 8, 9],
  willpower: [3, 4, 5],
  intellect: [3, 4, 5],
  combat: [3, 4, 5],
  agility: [3, 4, 5],
};

/** the phone's details control on a tile: opens the bottom sheet; looks small, takes a 44 px tap */
function DetailsButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className={styles.wzDetails}
      data-testid="wz-details"
      title={tr("wizard.details")}
      aria-label={`${tr("wizard.details")}: ${label}`}
      onClick={onClick}
    >
      i
    </button>
  );
}

/**
 * The campaign picker: filters across the top (kind, rules, length, a name), a grid of tiles showing each campaign's first
 * scenario card, and the campaign in the sidebar with its chapters in order. The filters and the sidebar are view state
 * (ADR-0004); the pick is the wizard's. On a narrow screen the sidebar opens over the grid.
 */
function CampaignStep({ s, set }: { s: WizardState; set: (w: WizardState) => void }) {
  const locale = useGame((s) => s.locale);
  const phone = useLayoutMode() === "phone";
  const filter = useWizardFilters((f) => f.campaign);
  const { setCampaign: setFilter, clearCampaign } = useWizardFilters.getState();
  const [sheet, setSheet] = useState(false);
  const list = filterCampaigns(db, locale, filter);
  const kind = (
    <FilterChips
      name="kind"
      label={tr("wizard.filter.kind")}
      all={tr("wizard.kind.all")}
      value={filter.kind}
      options={KINDS.map((v) => ({ value: v, label: tr(`wizard.kind.${v}`) }))}
      onChange={(kind) => {
        moment("tab");
        setFilter({ kind });
      }}
    />
  );
  const picked = db.campaigns[s.campaignId];
  return (
    <div className={cx(styles.wzInv, "wz-camp", sheet ? "sheet-open" : "")}>
      <div className={styles.wzInvMain}>
        <p className="wz-hint wz-intro">{tr("wizard.campaign.hint")}</p>
        <FilterToolbar
          query={filter.query}
          onQuery={(query) => setFilter({ query })}
          inline={phone ? undefined : kind}
          count={campaignFilterCount(filter)}
          shown={list.length}
          total={campaignOrder(db).length}
          pills={campaignPills(filter, tr).map((p) => ({
            key: p.key,
            label: p.label,
            clear: () => setFilter(p.clear(filter)),
          }))}
          onClear={clearCampaign}
        >
          {phone && kind}
          <FilterChips
            name="rules"
            label={tr("wizard.filter.rules")}
            value={filter.rules}
            options={RULES.map((v) => ({ value: v, label: tr(`wizard.rules.${v}`) }))}
            onChange={(rules) => setFilter({ rules })}
          />
          <FilterChips
            name="length"
            label={tr("wizard.filter.length")}
            value={filter.length}
            options={LENGTHS.map((v) => ({ value: v, label: tr(`wizard.length.${v}`) }))}
            onChange={(length) => setFilter({ length })}
          />
        </FilterToolbar>
        {list.length === 0 && (
          <p className="wz-hint">
            {tr("wizard.noCampaigns")}{" "}
            <button type="button" className="link-btn" onClick={clearCampaign}>
              {tr("wizard.filter.clear")}
            </button>
          </p>
        )}
        <div className={styles.wzCtiles}>
          {list.map((c) => {
            // the first chapter's art (the first agenda), found by code: a generated campaign's cards load only when it is chosen
            const card = c.cover ?? db.scenarios[c.scenarios[0]]?.agendas[0] ?? c.card;
            const art = card ? (db.cards[card] ?? { code: card }) : null;
            const on = s.campaignId === c.id;
            return (
              <div key={c.id} className={styles.wzTileWrap}>
                <button
                  className={cx(styles.wzCtile, on ? "selected" : "")}
                  aria-pressed={on}
                  onClick={() => {
                    moment("tab");
                    set(setCampaign(s, c.id, db));
                    // the phone opens the details from the tile's own control: a tap only picks
                    if (!phone) setSheet(true);
                  }}
                >
                  {art && (
                    <img
                      src={cardImage(art, "front", locale) ?? ""}
                      alt=""
                      loading="lazy"
                      draggable={false}
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  )}
                  <b>{tileName(db, c, locale)}</b>
                  <small>
                    {scenarioCount(c.scenarios.length)}
                    {!campaignComplete(db, c.id) && <span title={tr("wizard.generated")}> ◐</span>}
                  </small>
                </button>
                {phone && (
                  <DetailsButton
                    label={tileName(db, c, locale)}
                    onClick={() => {
                      set(setCampaign(s, c.id, db));
                      setSheet(true);
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
      {picked && !phone && (
        <div className={cx(styles.wzInvSide, styles.wzCampSide)} aria-live="polite">
          <CampaignSheet key={picked.id} campaign={picked} onClose={() => setSheet(false)} />
        </div>
      )}
      {picked && phone && sheet && (
        <BottomSheet
          title={tileName(db, picked, locale)}
          onClose={() => setSheet(false)}
          testId="wz-campaign-sheet"
          portal={false}
        >
          <CampaignSheet key={picked.id} campaign={picked} />
        </BottomSheet>
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
    <div className={styles.wzSheet}>
      <div className="wz-sheet-head">
        {isIcon(info.faction) && <Icon name={info.faction} size={30} />}
        <div>
          <b>{info.name}</b>
          {info.subname && <i>{info.subname}</i>}
        </div>
      </div>
      <div className={styles.wzSheetCard}>
        <CardFace code={code} locale={locale} remote />
      </div>
      {card ? (
        <>
          <div className={styles.wzSheetStats}>
            <Stat icon="health" value={card.health ?? "–"} size={30} label={tr("stat.health")} />
            <Stat icon="sanity" value={card.sanity ?? "–"} size={30} label={tr("stat.sanity")} />
            {(["willpower", "intellect", "combat", "agility"] as const).map((k) => (
              <Stat
                key={k}
                icon={k}
                value={card.skills?.[k] ?? "–"}
                size={28}
                label={tr(`stat.${k}`)}
              />
            ))}
          </div>
          {tx?.traits?.length ? (
            <div className={styles.wzSheetTraits}>{tx.traits.map((t) => `${t}.`).join(" ")}</div>
          ) : null}
          {tx?.text && (
            <p
              className="wz-sheet-text"
              dangerouslySetInnerHTML={{ __html: formatText(tx.text) }}
            />
          )}
          {tx?.backText && (
            <p
              className={cx("wz-sheet-text", styles.wzSheetBack)}
              dangerouslySetInnerHTML={{ __html: formatText(tx.backText) }}
            />
          )}
        </>
      ) : (
        <p className="wz-hint">{tr("wizard.loading")}</p>
      )}
      <small className={styles.wzSheetMeta}>
        {cycleName(db, locale, info.pack || "core")}
        {inv ? ` · ${tr("wizard.deckSize", { n: inv.deckSize })}` : ""}
      </small>
    </div>
  );
}

function InvestigatorsStep({ s, set }: { s: WizardState; set: (w: WizardState) => void }) {
  const locale = useGame((s) => s.locale);
  // filters, the order and the investigator in the sidebar are view state (ADR-0004): they are not part of the picks
  const phone = useLayoutMode() === "phone";
  const filter = useWizardFilters((f) => f.picker);
  const sort = useWizardFilters((f) => f.sort);
  const { setPicker: setFilter, setSort, clearPicker } = useWizardFilters.getState();
  const [focus, setFocus] = useState<string | null>(null);
  // the phone shows the investigator in a bottom sheet from the tile's details control
  const [sheet, setSheet] = useState<string | null>(null);
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
  const classes = (
    <div className="wz-chips" role="group" aria-label={tr("wizard.filter.class")}>
      {CLASSES.map((c) => (
        <button
          key={c}
          className={`wz-chip wz-class ${filter.faction === c ? "on" : ""}`}
          aria-pressed={filter.faction === c}
          title={tr(`card.faction.${c}`)}
          data-testid={`wz-class-${c}`}
          onClick={() => setFilter({ faction: filter.faction === c ? null : c })}
        >
          <Icon name={c} size={24} title={tr(`card.faction.${c}`)} />
        </button>
      ))}
    </div>
  );
  return (
    <div className={styles.wzInv}>
      <div className={styles.wzInvMain}>
        <p className="wz-hint wz-intro">{tr("wizard.investigators.hint")}</p>
        <FilterToolbar
          query={filter.query}
          onQuery={(query) => setFilter({ query })}
          inline={phone ? undefined : classes}
          count={pickerFilterCount(filter)}
          shown={list.length}
          total={Object.keys(db.investigators).length}
          pills={pickerPills(db, locale, filter, tr).map((p) => ({
            key: p.key,
            label: p.label,
            clear: () => setFilter(p.clear(filter)),
          }))}
          onClear={clearPicker}
        >
          {phone && classes}
          <label className={styles.wzSort}>
            <span>{tr("wizard.sort")}</span>
            <select
              data-testid="wz-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortBy)}
            >
              {SORTS.map((k) => (
                <option key={k} value={k}>
                  {tr(`wizard.sort.${k}`)}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.wzSort}>
            <span>{tr("wizard.filter.cycle")}</span>
            <select
              data-testid="wz-cycle"
              value={filter.cycle ?? ""}
              onChange={(e) => setFilter({ cycle: e.target.value || null })}
            >
              <option value="">{tr("wizard.filter.allCycles")}</option>
              {cyclesOf(db).map((p) => (
                <option key={p} value={p}>
                  {cycleName(db, locale, p)}
                </option>
              ))}
            </select>
          </label>
          <FilterChips
            name="rules"
            label={tr("wizard.filter.rules")}
            value={filter.rules}
            options={RULES.map((v) => ({ value: v, label: tr(`wizard.rules.${v}`) }))}
            onChange={(rules) => setFilter({ rules })}
          />
          {STAT_KEYS.map((k) => (
            <FilterChips
              key={k}
              name={`stat-${k}`}
              label={`${tr("wizard.filter.stats")}: ${tr(`stat.${k}`)}`}
              value={filter.stats[k] ?? null}
              options={MINS[k].map((n) => ({ value: n, label: `${n}+` }))}
              onChange={(n) => {
                const { [k]: _gone, ...rest } = filter.stats;
                setFilter({ stats: n === null ? rest : { ...rest, [k]: n } });
              }}
            />
          ))}
        </FilterToolbar>
        {!list.length && (
          <p className="wz-hint">
            {tr("wizard.noMatch")}{" "}
            <button type="button" className="link-btn" onClick={clearPicker}>
              {tr("wizard.filter.clear")}
            </button>
          </p>
        )}
        <div className={styles.wzTiles}>
          {list.map((i) => {
            const k = s.picks.indexOf(i.code);
            return (
              <div key={i.code} className={styles.wzTileWrap}>
                <button
                  className={cx(
                    "wz-tile",
                    k >= 0 ? "selected" : "",
                    i.needsDeck ? styles.needsDeck : "",
                    shown === i.code ? "focused" : "",
                  )}
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
                    {i.needsDeck && (
                      <small className={styles.wzNote}>{tr("wizard.needsDeck")}</small>
                    )}
                    {i.partlyImplemented && !i.needsDeck && (
                      <small
                        className={cx(styles.wzNote, styles.wzPartly)}
                        title={tr("wizard.partly")}
                      >
                        ◐ {tr("wizard.partlyShort")}
                      </small>
                    )}
                  </Avatar>
                </button>
                {phone && <DetailsButton label={i.name} onClick={() => setSheet(i.code)} />}
              </div>
            );
          })}
        </div>
      </div>
      {shown && !phone && (
        <aside className={styles.wzInvSide} aria-live="polite">
          <InvestigatorSheet key={shown} code={shown} />
        </aside>
      )}
      {phone && sheet && (
        <BottomSheet
          title={investigatorInfo(db, sheet, locale).name}
          onClose={() => setSheet(null)}
          testId="wz-investigator-sheet"
          portal={false}
        >
          <InvestigatorSheet key={sheet} code={sheet} />
        </BottomSheet>
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
  const phone = useLayoutMode() === "phone";
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
  if (!picksReady(db, s))
    return (
      <p className="wz-hint" role="status">
        {tr("wizard.loading")}
      </p>
    );
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
    <div className={styles.dk}>
      <div className={styles.dkRow}>
        <div className={styles.dkInvs} role="tablist" aria-label={tr("wizard.decks.title")}>
          {s.picks.map((c, k) => {
            const problems = deckProblems(db, s, c);
            return (
              <button
                key={c}
                role="tab"
                aria-selected={c === code}
                className={`dk-inv ${c === code ? "on" : ""}`}
                onClick={() => {
                  moment("tab");
                  setActive(c);
                }}
              >
                <Avatar code={c} size={phone ? 32 : 48} badge={`P${k + 1}`} />
                <small className={problems.length ? "bad" : "ok"}>
                  {problems.length ? tr("deck.toFix", { n: problems.length }) : tr("deck.ready")}
                </small>
              </button>
            );
          })}
        </div>
        <div className={styles.dkTabs} role="tablist">
          {tabs.map((x) => (
            <div
              key={x.id}
              className={cx(
                styles.dkTab,
                x.id === tab?.id ? "on" : "",
                x.problems.length ? "bad" : "",
              )}
              role="tab"
              aria-selected={x.id === tab?.id}
            >
              {renaming?.id === x.id ? (
                <input
                  autoFocus
                  className={styles.dkRename}
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
                <button
                  className={styles.dkTabName}
                  onClick={() => {
                    moment("tab");
                    choose(x.id);
                  }}
                  onDoubleClick={() =>
                    x.kind === "custom" && setRenaming({ id: x.id, name: x.name })
                  }
                  title={x.kind === "custom" ? tr("deck.renameHint") : undefined}
                >
                  {x.problems.length ? "⚠ " : ""}
                  {x.name}
                </button>
              )}
              {x.kind === "custom" && (
                <button
                  className={cx(styles.dkTabClose, deleting === x.id ? styles.confirm : "")}
                  aria-label={tr("deckEditor.delete")}
                  title={
                    deleting === x.id ? tr("deckEditor.confirmDelete") : tr("deckEditor.delete")
                  }
                  onBlur={() => setDeleting(null)}
                  onClick={() => {
                    if (deleting !== x.id) return setDeleting(x.id);
                    deleteCustomDeck(safeStorage(), x.id);
                    setDeleting(null);
                    if (tab?.id === x.id) choose(tabs[0].id);
                    bump((n) => n + 1);
                  }}
                >
                  <UiIcon name={deleting === x.id ? "check" : "none"} size={16} />
                </button>
              )}
            </div>
          ))}
          <button
            className={cx(styles.dkTab, styles.dkTabAdd)}
            onClick={addTab}
            title={tr("deck.newTab")}
            aria-label={tr("deck.newTab")}
          >
            +
          </button>
        </div>
      </div>
      {tab && tab.problems.length > 0 && (
        <div className={cx("problems", styles.dkProblems)} role="status">
          {tab.problems.slice(0, 4).map((p, k) => (
            <div key={k}>{problemText(db, locale, p)}</div>
          ))}
        </div>
      )}
      {tab && (
        <DeckEditArea
          key={`${code}:${tab.id}`}
          investigator={code}
          deck={tab.deck}
          onChange={edit}
        />
      )}
    </div>
  );
}

function DifficultyStep({ s, set }: { s: WizardState; set: (w: WizardState) => void }) {
  const bags = db.campaigns[s.campaignId]?.chaosBags ?? {};
  return (
    <div className="wz-bags">
      {DIFFICULTIES.filter((d) => bags[d]).map((d) => (
        <BagCard
          key={d}
          bag={bags[d]!}
          difficulty={d}
          selected={s.difficulty === d}
          onSelect={() => set(setDifficulty(s, d, db))}
        />
      ))}
    </div>
  );
}

function ReadyStep({ s }: { s: WizardState }) {
  const locale = useGame((s) => s.locale);
  const phone = useLayoutMode() === "phone";
  const c = db.campaigns[s.campaignId];
  const first = c.scenarios[0];
  const icon = scenarioIcon(first);
  return (
    <div className="wz-ready">
      <h2 className={styles.wzReadyCamp}>{tileName(db, c, locale)}</h2>
      <div className={styles.wzOrder}>
        {s.picks.map((code, k) => (
          <Avatar key={code} code={code} badge={`P${k + 1}`} size={phone ? 52 : undefined} />
        ))}
      </div>
      <BagCard bag={c.chaosBags[s.difficulty] ?? []} difficulty={s.difficulty} selected />
      <div className={styles.wzFirst}>
        <small>{tr("wizard.firstScenario")}</small>
        <b>
          {hasSymbol(icon) && <Glyph name={icon} size={26} title="" />}{" "}
          {scenarioText(db, first, locale).name}
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
        <div className={styles.wzDots} aria-hidden="true">
          {STEPS.map((x, k) => (
            <i key={x} className={k === at ? "on" : k < at ? "done" : ""} />
          ))}
        </div>
      </header>
      {/* keyed by step: a new body starts scrolled to the top (the list scrolled on one step would hide the next step's head) */}
      <div className="wz-body" key={s.step}>
        {s.step === "campaign" && <CampaignStep s={s} set={set} />}
        {s.step === "investigators" && <InvestigatorsStep s={s} set={set} />}
        {s.step === "decks" && <DecksStep s={s} set={set} />}
        {s.step === "difficulty" && <DifficultyStep s={s} set={set} />}
        {s.step === "ready" && <ReadyStep s={s} />}
      </div>
      <footer className="wz-foot">
        <button
          className="big"
          onClick={() => (at === 0 ? gameStore.setState({ screen: "title" }) : set(back(s)))}
        >
          {tr("wizard.back")}
        </button>
        {error && <span className="wz-error">{error}</span>}
        {last ? (
          <button
            className="primary big"
            disabled={loading}
            onClick={() => gameStore.getState().newCampaign(toSetup(s, Date.now() >>> 0, db))}
          >
            {tr(loading ? "wizard.loading" : "wizard.begin")}
          </button>
        ) : (
          <button
            className="primary big"
            disabled={!canContinue(db, s)}
            onClick={() => set(next(db, s))}
          >
            {tr("wizard.next")}
          </button>
        )}
      </footer>
    </div>
  );
}
