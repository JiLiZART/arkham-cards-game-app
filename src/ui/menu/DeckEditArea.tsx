import { useEffect, useMemo, useState } from "react";
import { cardText, t } from "../../content/i18n";
import type { CardDef, DeckDef } from "../../content/schema";
import { whyNot, whyNotReplace } from "../../engine/decks";
import { CardFace } from "../CardFace";
import { db, gameStore, useGame } from "../context";
import { basicWeaknesses, builderPool, changeCopies, problemText, replaceCard, withWeakness, type PoolFilter } from "../decks";
import { Icon } from "../Icon";
import { isIcon } from "../icons";

const tr = (key: string, vars?: Record<string, string | number>) => t(db, gameStore.getState().locale, key, vars);
const TYPES = ["asset", "event", "skill"] as const;
const CLASSES = ["guardian", "seeker", "rogue", "mystic", "survivor", "neutral"] as const;
const PAGE = 48;

/** a card of the grid: its scan, the copies, and the buttons that show on hover */
function GridCard({ card, n, lit, dim, why, children, onClick }: { card: CardDef; n?: number; lit?: boolean; dim?: boolean; why?: string | null; children?: React.ReactNode; onClick?: () => void }) {
  const locale = useGame((s) => s.locale);
  return (
    <div className={`dk-card ${lit ? "lit" : ""} ${dim ? "dim" : ""}`} data-card-code={card.code} onClick={onClick} title={cardText(db, card.code, locale).name}>
      <CardFace code={card.code} locale={locale} remote />
      {n !== undefined && n > 0 && <b className="dk-copies">×{n}</b>}
      {why && <small className="dk-why">{why}</small>}
      {children && <div className="dk-actions">{children}</div>}
    </div>
  );
}

/**
 * The editing area of a deck: on the left the deck itself as a grid of cards by type (the signature cards and the
 * weaknesses apart, fixed), a hover offering Remove; on the right the cards the investigator may add, with filters and
 * a search, a hover offering Add or Replace. Replace lights the deck's cards it may stand in for: a click on one swaps
 * them. Every change goes to `onChange` with the deck's new cards.
 */
export function DeckEditArea({ investigator, deck, onChange, weakness = true }: { investigator: string; deck: DeckDef; onChange: (cards: Record<string, number>, randomBasicWeakness: boolean) => void; weakness?: boolean }) {
  const locale = useGame((s) => s.locale);
  const inv = db.investigators[investigator];
  const [filter, setFilter] = useState<PoolFilter>({ query: "", factions: [], types: [], levels: [] });
  const [shown, setShown] = useState(PAGE);
  const [replacing, setReplacing] = useState<string | null>(null);
  useEffect(() => setShown(PAGE), [filter]);
  useEffect(() => setReplacing(null), [deck.id]);
  // Escape leaves the replace mode
  useEffect(() => {
    if (!replacing) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && setReplacing(null);
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [replacing]);
  const pool = useMemo(() => builderPool(db, locale, investigator, filter), [locale, investigator, filter]);
  const required = new Set([...(inv?.signatures ?? []), ...(inv?.weaknesses ?? []), ...Object.values(inv?.alternatives ?? {}).flat()]);
  const nameOf = (c: CardDef) => cardText(db, c.code, locale).name;
  const entries = Object.entries(deck.cards)
    .map(([code, n]) => ({ card: db.cards[code], n }))
    .filter((x) => x.card)
    .sort((a, b) => (a.card.cost ?? 0) - (b.card.cost ?? 0) || nameOf(a.card).localeCompare(nameOf(b.card)));
  const fixed = entries.filter((x) => required.has(x.card.code) || x.card.subtype);
  const size = entries.reduce((n, x) => n + (required.has(x.card.code) || x.card.subtype ? 0 : x.n), 0);
  const chosenWeakness = Object.keys(deck.cards).find((c) => db.cards[c]?.subtype === "basicweakness") ?? "";
  const reason = (r: ReturnType<typeof whyNot>) => (r ? problemText(db, locale, { message: r.key, reason: r }) : null);
  const change = (cards: Record<string, number>) => onChange(cards, deck.randomBasicWeakness);
  const swap = (out: string) => {
    if (!replacing) return;
    change(replaceCard(deck.cards, out, replacing));
    setReplacing(null);
  };
  const into = replacing ? db.cards[replacing] : null;
  return (
    <div className={`dk-area ${replacing ? "replacing" : ""}`}>
      <section className="dk-deck">
        <header className="dk-head">
          <b>{tr("deckEditor.size", { n: size, size: inv?.deckSize ?? 30 })}</b>
          {weakness && (
            <label className="dk-weakness">
              {tr("deckEditor.weakness")}
              <select
                value={chosenWeakness}
                onChange={(e) => {
                  const d = withWeakness(db, deck, e.target.value || null);
                  onChange(d.cards, d.randomBasicWeakness);
                }}
              >
                <option value="">{tr("deckEditor.random")}</option>
                {basicWeaknesses(db).map((c) => (
                  <option key={c.code} value={c.code}>
                    {nameOf(c)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </header>
        {into && (
          <div className="dk-replace-bar" role="status">
            <span>{tr("deck.replaceWith", { card: nameOf(into) })}</span>
            <button onClick={() => setReplacing(null)}>{tr("deckEditor.cancel")}</button>
          </div>
        )}
        {TYPES.map((type) => {
          const rows = entries.filter((x) => x.card.type === type && !required.has(x.card.code) && !x.card.subtype);
          if (!rows.length) return null;
          return (
            <div key={type} className="dk-group">
              <h4>
                {tr(`deckEditor.${type}`)} · {rows.reduce((n, x) => n + x.n, 0)}
              </h4>
              <div className="dk-grid">
                {rows.map(({ card, n }) => {
                  const target = replacing ? !whyNotReplace(db, deck, card.code, replacing) : false;
                  return (
                    <GridCard key={card.code} card={card} n={n} lit={target} dim={!!replacing && !target} onClick={target ? () => swap(card.code) : undefined}>
                      {!replacing && (
                        <button onClick={() => change(changeCopies(deck.cards, card.code, -1))} aria-label={tr("deckEditor.remove", { card: nameOf(card) })}>
                          − {tr("deck.remove")}
                        </button>
                      )}
                    </GridCard>
                  );
                })}
              </div>
            </div>
          );
        })}
        {fixed.length > 0 && (
          <div className="dk-group">
            <h4>{tr("deckEditor.always")}</h4>
            <div className="dk-grid">
              {fixed.map(({ card, n }) => (
                <GridCard key={card.code} card={card} n={n} dim={!!replacing} />
              ))}
            </div>
          </div>
        )}
      </section>
      <section className="dk-pool">
        <header className="dk-filters">
          <input type="search" value={filter.query} placeholder={tr("deckEditor.search")} aria-label={tr("deckEditor.search")} onChange={(e) => setFilter({ ...filter, query: e.target.value })} />
          <div className="wz-chips" role="group" aria-label={tr("catalog.class")}>
            {CLASSES.map((c) => (
              <button key={c} className={`wz-chip wz-class ${filter.factions.includes(c) ? "on" : ""}`} aria-pressed={filter.factions.includes(c)} title={tr(`card.faction.${c}`)} onClick={() => setFilter({ ...filter, factions: filter.factions.includes(c) ? filter.factions.filter((x) => x !== c) : [...filter.factions, c] })}>
                {isIcon(c) ? <Icon name={c} size={22} title={tr(`card.faction.${c}`)} /> : c}
              </button>
            ))}
          </div>
          <div className="wz-chips" role="group" aria-label={tr("catalog.type")}>
            {TYPES.map((x) => (
              <button key={x} className={`wz-chip ${filter.types.includes(x) ? "on" : ""}`} aria-pressed={filter.types.includes(x)} onClick={() => setFilter({ ...filter, types: filter.types.includes(x) ? filter.types.filter((y) => y !== x) : [...filter.types, x] })}>
                {tr(`card.type.${x}`)}
              </button>
            ))}
          </div>
          <div className="wz-chips" role="group" aria-label={tr("catalog.level")}>
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <button key={n} className={`wz-chip ${filter.levels.includes(n) ? "on" : ""}`} aria-pressed={filter.levels.includes(n)} title={tr("card.level", { n })} onClick={() => setFilter({ ...filter, levels: filter.levels.includes(n) ? filter.levels.filter((y) => y !== n) : [...filter.levels, n] })}>
                {n}
              </button>
            ))}
          </div>
          <small className="dk-count">{tr("deckEditor.pool", { n: pool.length })}</small>
        </header>
        <div className="dk-grid">
          {pool.slice(0, shown).map((card) => {
            const why = reason(whyNot(db, deck, card.code));
            return (
              <GridCard key={card.code} card={card} n={deck.cards[card.code]} why={why} dim={!!replacing && replacing !== card.code} lit={replacing === card.code}>
                {!replacing && (
                  <>
                    <button className="primary" disabled={!!why} onClick={() => change(changeCopies(deck.cards, card.code, 1))} aria-label={tr("deckEditor.add", { card: nameOf(card) })}>
                      + {tr("deck.add")}
                    </button>
                    <button onClick={() => setReplacing(card.code)} aria-label={tr("deck.replaceWith", { card: nameOf(card) })}>
                      ⇄ {tr("deck.replace")}
                    </button>
                  </>
                )}
              </GridCard>
            );
          })}
        </div>
        {shown < pool.length && (
          <button className="link-btn dk-more" onClick={() => setShown(shown + PAGE)}>
            {tr("catalog.more", { n: shown, total: pool.length })}
          </button>
        )}
      </section>
    </div>
  );
}
