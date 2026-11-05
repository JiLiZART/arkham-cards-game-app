import { useEffect, useMemo, useRef, useState } from "react";
import { useLayoutMode } from "../../state/layoutMode";
import { cardText, t } from "../../../content/i18n";
import type { CardDef, DeckDef } from "../../../content/schema";
import { whyNot, bondedHost } from "../../../engine/campaign/decks";
import { CardFace } from "../../components/CardFace";
import { db, gameStore, useGame } from "../../state/context";
import {
  basicWeaknesses,
  builderPool,
  changeCopies,
  problemText,
  replaceCard,
  replacementsFor,
  withWeakness,
  type PoolFilter,
} from "../../game/decks";
import { Icon, UiIcon } from "../../components/Icon";
import { classBadge } from "../../assets/icons";
import { moment } from "../../hud/SoundLayer";
import { cx } from "../../components/cx";
import styles from "./DeckEditArea.module.css";

const tr = (key: string, vars?: Record<string, string | number>) =>
  t(db, gameStore.getState().locale, key, vars);
const TYPES = ["asset", "event", "skill"] as const;
const CLASSES = ["guardian", "seeker", "rogue", "mystic", "survivor", "neutral"] as const;
const PAGE = 48;

/** a card of the grid: its scan, the copies, and the buttons that show on hover */
function GridCard({
  card,
  n,
  why,
  children,
  onClick,
}: {
  card: CardDef;
  n?: number;
  why?: string | null;
  children?: React.ReactNode;
  onClick?: () => void;
}) {
  const locale = useGame((s) => s.locale);
  return (
    <div
      className={cx(styles.dkCard, onClick ? styles.pick : "")}
      data-card-code={card.code}
      onClick={onClick}
      title={cardText(db, card.code, locale).name}
    >
      <CardFace code={card.code} locale={locale} remote />
      {n !== undefined && n > 0 && <b className={styles.dkCopies}>×{n}</b>}
      {why && <small className={styles.dkWhy}>{why}</small>}
      {children && <div className={styles.dkActions}>{children}</div>}
    </div>
  );
}

/**
 * The editing area of a deck: the deck itself across the whole width as a grid of cards by type (the signature cards and
 * the weaknesses apart, fixed), a hover offering Replace and Remove. The cards the investigator may take open in a picker
 * (a dialog on the desktop, full screen on the phone), with filters and a search: from "Add cards" each offers Add; from a
 * deck card's Replace only the cards that may stand in for it, and a tap on one swaps them. Every change goes to
 * `onChange` with the deck's new cards.
 */
export function DeckEditArea({
  investigator,
  deck,
  onChange,
  weakness = true,
}: {
  investigator: string;
  deck: DeckDef;
  onChange: (cards: Record<string, number>, randomBasicWeakness: boolean) => void;
  weakness?: boolean;
}) {
  const locale = useGame((s) => s.locale);
  const inv = db.investigators[investigator];
  const [filter, setFilter] = useState<PoolFilter>({
    query: "",
    factions: [],
    types: [],
    levels: [],
  });
  const [shown, setShown] = useState(PAGE);
  // the card picker: closed, adding, or choosing what replaces one card of the deck (view state, ADR-0004)
  const [picker, setPicker] = useState<null | { mode: "add" } | { mode: "replace"; out: string }>(
    null,
  );
  const phone = useLayoutMode() === "phone";
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => setShown(PAGE), [filter, picker]);
  useEffect(() => setPicker(null), [deck.id]);
  // the picker takes the focus and closes on Escape
  useEffect(() => {
    if (!picker) return;
    dialog.current?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => e.key === "Escape" && setPicker(null);
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [picker]);
  const pool = useMemo(
    () => builderPool(db, locale, investigator, filter),
    [locale, investigator, filter],
  );
  const required = new Set([
    ...(inv?.signatures ?? []),
    ...(inv?.weaknesses ?? []),
    ...Object.values(inv?.alternatives ?? {}).flat(),
  ]);
  const nameOf = (c: CardDef) => cardText(db, c.code, locale).name;
  // the cards bonded to the deck's cards: they come with them, set aside, outside the deck
  const bonded = Object.values(db.cards).filter((c) => {
    const host = bondedHost(c);
    return !!host && !!deck.cards[host];
  });
  const costNum = (c: CardDef) => (typeof c.cost === "number" ? c.cost : 0);
  const entries = Object.entries(deck.cards)
    .map(([code, n]) => ({ card: db.cards[code], n }))
    .filter((x) => x.card)
    .sort(
      (a, b) => costNum(a.card) - costNum(b.card) || nameOf(a.card).localeCompare(nameOf(b.card)),
    );
  const fixed = entries.filter((x) => required.has(x.card.code) || x.card.subtype);
  const size = entries.reduce(
    (n, x) => n + (required.has(x.card.code) || x.card.subtype ? 0 : x.n),
    0,
  );
  const chosenWeakness =
    Object.keys(deck.cards).find((c) => db.cards[c]?.subtype === "basicweakness") ?? "";
  const reason = (r: ReturnType<typeof whyNot>) =>
    r ? problemText(db, locale, { message: r.key, reason: r }) : null;
  const change = (cards: Record<string, number>) => onChange(cards, deck.randomBasicWeakness);
  const outCard = picker?.mode === "replace" ? db.cards[picker.out] : null;
  const offered = picker?.mode === "replace" ? replacementsFor(db, deck, picker.out, pool) : pool;
  const swap = (into: string) => {
    if (picker?.mode !== "replace") return;
    moment("builderReplace");
    change(replaceCard(deck.cards, picker.out, into));
    setPicker(null);
  };
  const title = outCard
    ? tr("deckEditor.replaceTitle", { card: nameOf(outCard) })
    : tr("deckEditor.addCards");
  const poolSection = (
    <section className={styles.dkPool}>
      <header className={styles.dkFilters}>
        <input
          type="search"
          value={filter.query}
          placeholder={tr("deckEditor.search")}
          aria-label={tr("deckEditor.search")}
          onChange={(e) => setFilter({ ...filter, query: e.target.value })}
        />
        <div className="wz-chips" role="group" aria-label={tr("catalog.class")}>
          {CLASSES.map((c) => (
            <button
              key={c}
              className={`wz-chip wz-class ${filter.factions.includes(c) ? "on" : ""}`}
              aria-pressed={filter.factions.includes(c)}
              title={tr(`card.faction.${c}`)}
              onClick={() =>
                setFilter({
                  ...filter,
                  factions: filter.factions.includes(c)
                    ? filter.factions.filter((x) => x !== c)
                    : [...filter.factions, c],
                })
              }
            >
              <Icon {...classBadge(c, 26)} title={tr(`card.faction.${c}`)} />
            </button>
          ))}
        </div>
        <div className="wz-chips" role="group" aria-label={tr("catalog.type")}>
          {TYPES.map((x) => (
            <button
              key={x}
              className={`wz-chip ${filter.types.includes(x) ? "on" : ""}`}
              aria-pressed={filter.types.includes(x)}
              onClick={() =>
                setFilter({
                  ...filter,
                  types: filter.types.includes(x)
                    ? filter.types.filter((y) => y !== x)
                    : [...filter.types, x],
                })
              }
            >
              {tr(`card.type.${x}`)}
            </button>
          ))}
        </div>
        <div className="wz-chips" role="group" aria-label={tr("catalog.level")}>
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              className={`wz-chip ${filter.levels.includes(n) ? "on" : ""}`}
              aria-pressed={filter.levels.includes(n)}
              title={tr("card.level", { n })}
              onClick={() =>
                setFilter({
                  ...filter,
                  levels: filter.levels.includes(n)
                    ? filter.levels.filter((y) => y !== n)
                    : [...filter.levels, n],
                })
              }
            >
              {n}
            </button>
          ))}
        </div>
        <small className={styles.dkCount}>
          {tr(outCard ? "deckEditor.canReplace" : "deckEditor.pool", { n: offered.length })}
        </small>
      </header>
      {outCard && !offered.length && (
        <p className={styles.dkCount}>{tr("deckEditor.noReplacement")}</p>
      )}
      <div className={cx(styles.dkGrid, styles.dkPickGrid)}>
        {offered.slice(0, shown).map((card) =>
          outCard ? (
            <GridCard
              key={card.code}
              card={card}
              n={deck.cards[card.code]}
              onClick={() => swap(card.code)}
            >
              <button
                className="primary"
                data-testid="dk-replace-with"
                onClick={(e) => {
                  e.stopPropagation();
                  swap(card.code);
                }}
                aria-label={tr("deckEditor.replaceWith", {
                  card: nameOf(card),
                  out: nameOf(outCard),
                })}
              >
                ⇄ {tr("deck.replace")}
              </button>
            </GridCard>
          ) : (
            <GridCard
              key={card.code}
              card={card}
              n={deck.cards[card.code]}
              why={reason(whyNot(db, deck, card.code))}
            >
              <button
                className="primary"
                data-testid="dk-add"
                disabled={!!whyNot(db, deck, card.code)}
                onClick={() => {
                  moment("builderAdd");
                  change(changeCopies(deck.cards, card.code, 1));
                }}
                aria-label={tr("deckEditor.add", { card: nameOf(card) })}
              >
                + {tr("deck.add")}
              </button>
            </GridCard>
          ),
        )}
      </div>
      {shown < offered.length && (
        <button className={cx("link-btn", styles.dkMore)} onClick={() => setShown(shown + PAGE)}>
          {tr("catalog.more", { n: shown, total: offered.length })}
        </button>
      )}
    </section>
  );
  return (
    <div className={styles.dkArea}>
      <section className={styles.dkDeck}>
        <header className={styles.dkHead}>
          <b>{tr("deckEditor.size", { n: size, size: inv?.deckSize ?? 30 })}</b>
          <button
            type="button"
            className="primary"
            data-testid="dk-add-cards"
            onClick={() => setPicker({ mode: "add" })}
          >
            + {tr("deckEditor.addCards")}
          </button>
          {weakness && (
            <label className={styles.dkWeakness}>
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
        {TYPES.map((type) => {
          const rows = entries.filter(
            (x) => x.card.type === type && !required.has(x.card.code) && !x.card.subtype,
          );
          if (!rows.length) return null;
          return (
            <div key={type} className={styles.dkGroup}>
              <h4>
                {tr(`deckEditor.${type}`)} · {rows.reduce((n, x) => n + x.n, 0)}
              </h4>
              <div className={styles.dkGrid}>
                {rows.map(({ card, n }) => (
                  <GridCard key={card.code} card={card} n={n}>
                    <button
                      data-testid="dk-replace"
                      onClick={() => setPicker({ mode: "replace", out: card.code })}
                      aria-label={tr("deckEditor.replace", { card: nameOf(card) })}
                    >
                      ⇄ {tr("deck.replace")}
                    </button>
                    <button
                      data-testid="dk-remove"
                      onClick={() => {
                        moment("builderRemove");
                        change(changeCopies(deck.cards, card.code, -1));
                      }}
                      aria-label={tr("deckEditor.remove", { card: nameOf(card) })}
                    >
                      − {tr("deck.remove")}
                    </button>
                  </GridCard>
                ))}
              </div>
            </div>
          );
        })}
        {bonded.length > 0 && (
          <div className={styles.dkGroup} data-testid="dk-bonded">
            <h4>{tr("deckEditor.bonded")}</h4>
            <div className={styles.dkGrid}>
              {bonded.map((card) => (
                <GridCard key={card.code} card={card} n={card.quantity} />
              ))}
            </div>
          </div>
        )}
        {fixed.length > 0 && (
          <div className={styles.dkGroup}>
            <h4>{tr("deckEditor.always")}</h4>
            <div className={styles.dkGrid}>
              {fixed.map(({ card, n }) => (
                <GridCard key={card.code} card={card} n={n} />
              ))}
            </div>
          </div>
        )}
      </section>
      {picker && (
        <div
          className={cx(styles.dkScrim, phone ? styles.phone : "")}
          onPointerDown={(e) => e.target === e.currentTarget && setPicker(null)}
        >
          <div
            ref={dialog}
            tabIndex={-1}
            className={styles.dkPicker}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            data-testid="dk-pool"
          >
            <header className={styles.dkPoolBar}>
              <b>{title}</b>
              <button
                type="button"
                className={styles.dkPoolClose}
                data-testid="dk-pool-close"
                onClick={() => setPicker(null)}
                title={tr("sheet.close")}
                aria-label={tr("sheet.close")}
              >
                <UiIcon name="none" size={20} />
              </button>
            </header>
            {poolSection}
          </div>
        </div>
      )}
    </div>
  );
}
