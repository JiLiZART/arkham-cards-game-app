import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { loadAllPacks } from "../../content";
import { cardText, encounterSetName, t } from "../../content/i18n";
import type { CardDef } from "../../content/schema";
import { db, gameStore, useGame } from "../context";
import { CardFace } from "../CardFace";
import { Icon } from "../Icon";
import { isIcon } from "../icons";
import { useLayout } from "../layoutMode";
import { cycleName } from "../menu/wizard";
import { CardPage, WorksBadge } from "./CardPage";
import { catalogCards, cyclesOfCards, emptyFilters, packsOfCards, traitsOf, type CatalogFilters, type Tab } from "./filter";
import { useCatalog } from "./state";

const TABS: Tab[] = ["investigators", "player", "encounter"];
const CLASSES = ["guardian", "seeker", "rogue", "mystic", "survivor", "neutral"];
const SKILLS = ["willpower", "intellect", "combat", "agility", "wild"];
const SLOTS = ["hand", "arcane", "accessory", "body", "ally", "tarot", "head"];
const PAGE = 60;

const tr = (key: string, vars?: Record<string, string | number>) => t(db, gameStore.getState().locale, key, vars);

/** a row of toggle chips: the chosen values are `on` */
export function Chips<T extends string | number>({ label, options, on, set }: { label: string; options: { value: T; label: ReactNode }[]; on: T[]; set(v: T[]): void }) {
  if (!options.length) return null;
  return (
    <div className="cat-filter" role="group" aria-label={label}>
      <span className="hd-label">{label}</span>
      <div className="wz-chips">
        {options.map((o) => (
          <button key={o.value} className={`wz-chip ${on.includes(o.value) ? "on" : ""}`} aria-pressed={on.includes(o.value)} onClick={() => set(on.includes(o.value) ? on.filter((v) => v !== o.value) : [...on, o.value])}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** a single choice among many: "Any" or one value */
function Pick({ label, options, value, set }: { label: string; options: { value: string; label: string }[]; value: string; set(v: string): void }) {
  if (!options.length) return null;
  return (
    <label className="cat-filter">
      <span className="hd-label">{label}</span>
      <select value={value} onChange={(e) => set(e.target.value)}>
        <option value="">{tr("catalog.any")}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Filters({ tabCards, locale }: { tabCards: CardDef[]; locale: string }) {
  const { filters: f, set, clear } = useCatalog();
  const player = f.tab === "player";
  const types = [...new Set(tabCards.map((c) => c.type))];
  const cycles = cyclesOfCards(db, tabCards);
  const inCycle = f.cycles.length ? catalogCards(db, locale, { ...emptyFilters, tab: f.tab, cycles: f.cycles }) : tabCards;
  const sets = [...new Set(tabCards.flatMap((c) => c.encounterSet ?? []))].sort();
  const one = (v: string) => (v ? [v] : []);
  return (
    <div className="cat-filters">
      <input type="search" placeholder={tr("catalog.search")} aria-label={tr("catalog.search")} value={f.query} onChange={(e) => set({ query: e.target.value })} />
      {f.tab !== "encounter" && (
        <Chips label={tr("catalog.class")} on={f.factions} set={(factions) => set({ factions })} options={CLASSES.map((c) => ({ value: c, label: isIcon(c) ? <Icon name={c} size={24} title={tr(`card.faction.${c}`)} /> : tr(`card.faction.${c}`) }))} />
      )}
      <Chips label={tr("catalog.type")} on={f.types} set={(v) => set({ types: v })} options={types.map((x) => ({ value: x, label: tr(`card.type.${x}`) }))} />
      <Pick label={tr("catalog.cycle")} value={f.cycles[0] ?? ""} set={(v) => set({ cycles: one(v), packs: [] })} options={cycles.map((c) => ({ value: c, label: cycleName(db, locale, c) }))} />
      <Pick label={tr("catalog.pack")} value={f.packs[0] ?? ""} set={(v) => set({ packs: one(v) })} options={packsOfCards(inCycle).map((p) => ({ value: p, label: p.toUpperCase() }))} />
      {player && <Chips label={tr("catalog.level")} on={f.levels} set={(levels) => set({ levels })} options={[0, 1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }))} />}
      {player && <Chips label={tr("catalog.cost")} on={f.costs} set={(costs) => set({ costs })} options={[0, 1, 2, 3, 4, 5, 6].map((n) => ({ value: n, label: String(n) }))} />}
      {player && <Chips label={tr("catalog.icons")} on={f.icons} set={(icons) => set({ icons })} options={SKILLS.map((s) => ({ value: s, label: isIcon(s) ? <Icon name={s} size={24} title={tr(`stat.${s}`)} /> : s }))} />}
      {player && <Chips label={tr("catalog.slot")} on={f.slots} set={(slots) => set({ slots })} options={SLOTS.map((s) => ({ value: s, label: isIcon(s) ? <Icon name={s} size={24} title={tr(`card.slot.${s}`)} /> : tr(`card.slot.${s}`) }))} />}
      <Pick label={tr("catalog.trait")} value={f.traits[0] ?? ""} set={(v) => set({ traits: one(v) })} options={traitsOf(db, locale, tabCards).map((x) => ({ value: x, label: x }))} />
      {f.tab === "encounter" && <Pick label={tr("catalog.set")} value={f.sets[0] ?? ""} set={(v) => set({ sets: one(v) })} options={sets.map((x) => ({ value: x, label: encounterSetName(db, x, locale) ?? x }))} />}
      <Pick label={tr("catalog.status")} value={f.works === "any" ? "" : f.works} set={(v) => set({ works: (v || "any") as CatalogFilters["works"] })} options={[{ value: "yes", label: tr("catalog.works") }, { value: "no", label: tr("catalog.textOnly") }]} />
      <button className="link-btn" onClick={clear}>
        {tr("catalog.clear")}
      </button>
    </div>
  );
}

/** one card in the results: its image (grid) or a row (list), name, class, type and pack */
function Entry({ c, locale, view }: { c: CardDef; locale: string; view: "grid" | "list" }) {
  const open = useCatalog((s) => s.openCard);
  const tx = cardText(db, c.code, locale);
  const line = [tr(`card.faction.${c.faction}`), tr(`card.type.${c.type}`), c.pack.toUpperCase()].join(" · ");
  return (
    <button className={`cat-entry ${view}`} onClick={() => open(c.code)}>
      {view === "grid" && (
        <span className="cat-thumb">
          <CardFace code={c.code} locale={locale} remote />
        </span>
      )}
      <span className="cat-name">
        <b>{tx.name}</b>
        {tx.subname && <i> {tx.subname}</i>}
        <small>
          {line}
          {c.xp ? ` · ${tr("card.level", { n: c.xp })}` : ""}
          {view === "list" && c.cost !== undefined && c.cost !== null ? ` · ${tr("card.cost")} ${c.cost}` : ""}
        </small>
      </span>
      {view === "list" && <WorksBadge code={c.code} />}
    </button>
  );
}

/** the Cards screen: every card and investigator, filterable, each with a page (the packs load when it opens) */
export function Catalog() {
  const locale = useGame((s) => s.locale);
  const { mode } = useLayout();
  const { filters, view, open, setTab, setView } = useCatalog();
  const [progress, setProgress] = useState<[number, number]>([0, 1]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let live = true;
    loadAllPacks((done, total) => live && setProgress([done, total]))
      .then((errors) => live && errors.length && setError(`${errors[0].path} ${errors[0].message}`))
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, []);
  const tabCards = useMemo(() => (ready ? catalogCards(db, locale, { ...emptyFilters, tab: filters.tab }) : []), [ready, locale, filters.tab]);
  const results = useMemo(() => (ready ? catalogCards(db, locale, filters) : []), [ready, locale, filters]);
  // a new search starts at the top; scrolling to the end of the page shows the next sixty
  useEffect(() => setShown(PAGE), [filters, locale]);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && setShown((n) => n + PAGE), { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [ready, results, open.length]);
  const page = open[open.length - 1];
  return (
    <div className={`screen catalog ${mode}`}>
      <header className="wz-head">
        <h1>{tr("catalog.title")}</h1>
      </header>
      {!ready && <p className="wz-hint" role="status">{tr("catalog.loading", { done: progress[0], total: progress[1] })}</p>}
      {error && <p className="wz-error">{tr("catalog.loadError", { message: error })}</p>}
      {ready && page && <CardPage key={page} code={page} />}
      {ready && !page && (
        <>
          <div className="cat-tabs" role="tablist">
            {TABS.map((x) => (
              <button key={x} role="tab" aria-selected={filters.tab === x} className={`wz-chip ${filters.tab === x ? "on" : ""}`} onClick={() => setTab(x)}>
                {tr(`catalog.tab.${x}`)}
              </button>
            ))}
            <span className="cat-count" role="status">
              {tr("catalog.count", { n: results.length })}
            </span>
            <button className="wz-chip" onClick={() => setView(view === "grid" ? "list" : "grid")}>
              {tr(view === "grid" ? "catalog.list" : "catalog.grid")}
            </button>
            {mode === "phone" && (
              <button className="wz-chip" aria-expanded={drawer} onClick={() => setDrawer(!drawer)}>
                {tr("catalog.filters")}
              </button>
            )}
          </div>
          <div className="cat-main">
            {(mode !== "phone" || drawer) && (
              <aside className={`cat-aside ${mode === "phone" ? "drawer" : ""}`}>
                <Filters tabCards={tabCards} locale={locale} />
              </aside>
            )}
            <div className={`cat-results ${view}`}>
              {!results.length && <p className="wz-hint">{tr("catalog.noMatch")}</p>}
              {results.slice(0, shown).map((c) => (
                <Entry key={c.code} c={c} locale={locale} view={view} />
              ))}
              <div ref={sentinel} className="cat-sentinel" aria-hidden="true" />
            </div>
          </div>
        </>
      )}
      <footer className="wz-foot">
        <button className="big" onClick={() => (page ? useCatalog.getState().back() : gameStore.setState({ screen: "title" }))}>
          {tr("wizard.back")}
        </button>
        {ready && !page && shown < results.length && <span className="wz-hint">{tr("catalog.more", { n: Math.min(shown, results.length), total: results.length })}</span>}
      </footer>
    </div>
  );
}
