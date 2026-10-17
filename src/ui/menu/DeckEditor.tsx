import { useMemo, useState } from "react";
import { cardText, t } from "../../content/i18n";
import type { CardDef } from "../../content/schema";
import { validateDeck } from "../../engine/decks";
import { db, gameStore, useGame } from "../context";
import { addOp, applySwaps, basicWeaknesses, defaultDeckName, poolFor, problemText, saveCustomDeck, swapBudget, type DeckOp, type SavedDeck } from "../decks";
import { chipsFor } from "../glance";
import { Glyph, Icon } from "../Icon";
import { isIcon } from "../icons";
import { safeStorage } from "../store";
import { Avatar } from "./Avatar";

const tr = (key: string, vars?: Record<string, string | number>) => t(db, gameStore.getState().locale, key, vars);
const TYPES = ["asset", "event", "skill"] as const;

/** a card's glance chips, inline in a list row */
function Chips({ card }: { card: CardDef }) {
  const locale = useGame((s) => s.locale);
  return (
    <span className="de-chips">
      {chipsFor(card).map((c, k) => (
        <span key={k} className="de-chip" title={t(db, locale, `glance.${c.icon}`)}>
          {isIcon(c.icon) ? <Icon name={c.icon} size={18} title="" /> : <Glyph name={c.icon} size={16} title="" />}
          {c.n !== undefined && <b>{c.plus ? "+" : ""}{c.n}</b>}
        </span>
      ))}
    </span>
  );
}

const costOf = (c: CardDef) => (c.cost === undefined || c.cost === null ? "–" : String(c.cost));

/**
 * Edit a starter (or saved) deck into a custom deck: the deck as a list by type with the signature cards and weakness
 * slot apart, a pool of cards to add, the swap budget, the basic weakness, and the deck's validation in plain words.
 * Save is disabled while the deck is invalid; a starter deck is never touched.
 */
export function DeckEditor({ investigator, baseId, initialOps, initialName, onSave, onCancel }: { investigator: string; baseId: string; initialOps: DeckOp[]; initialName?: string; onSave: (d: SavedDeck) => void; onCancel: () => void }) {
  const locale = useGame((s) => s.locale);
  const base = db.decks[baseId];
  const [ops, setOps] = useState<DeckOp[]>(initialOps);
  const [name, setName] = useState(initialName ?? defaultDeckName(db, investigator, locale));
  const [query, setQuery] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const deck = useMemo(() => applySwaps(db, base, ops), [base, ops]);
  const problems = useMemo(() => validateDeck(db, { ...deck, investigator }), [deck, investigator]);
  const budget = swapBudget(db, base, ops);
  const pool = useMemo(() => poolFor(db, investigator), [investigator]);
  const inv = db.investigators[investigator];
  const required = new Set([...inv.signatures, ...inv.weaknesses]);
  const nameOf = (c: CardDef) => cardText(db, c.code, locale).name;
  const weaknesses = basicWeaknesses(db);
  const chosenWeakness = Object.keys(deck.cards).find((c) => db.cards[c]?.subtype === "basicweakness") ?? "";

  const push = (op: DeckOp) => {
    const r = addOp(db, base, ops, op);
    if (!r.ok) return setNote(tr("deckEditor.limit", { limit: budget.limit }));
    setNote(null);
    setOps(r.ops);
  };
  const inDeck = (type: string) =>
    Object.entries(deck.cards)
      .map(([code, n]) => ({ card: db.cards[code], n }))
      .filter((x) => x.card && x.card.type === type && !required.has(x.card.code) && !x.card.subtype)
      .sort((a, b) => nameOf(a.card).localeCompare(nameOf(b.card)));
  const fixed = [...inv.signatures, ...inv.weaknesses].map((c) => db.cards[c]).filter(Boolean);
  const q = query.trim().toLocaleLowerCase(locale);
  const shown = pool.filter((c) => !q || nameOf(c).toLocaleLowerCase(locale).includes(q));
  const size = Object.entries(deck.cards).reduce((n, [c, k]) => n + (required.has(c) || db.cards[c]?.subtype ? 0 : k), 0);

  return (
    <div className="deck-editor">
      <header className="de-head">
        <Avatar code={investigator} size={56} />
        <div className="de-status">
          <b className={problems.length ? "bad" : "ok"}>{tr("deckEditor.size", { n: size, size: inv.deckSize })}</b>
          <span>{tr("deckEditor.swaps", { used: budget.used, limit: budget.limit })}</span>
        </div>
        <label className="de-weakness">
          {tr("deckEditor.weakness")}
          <select
            value={chosenWeakness}
            onChange={(e) => push({ op: "weakness", code: e.target.value || null })}
          >
            <option value="">{tr("deckEditor.random")}</option>
            {weaknesses.map((c) => (
              <option key={c.code} value={c.code}>
                {nameOf(c)}
              </option>
            ))}
          </select>
        </label>
      </header>
      <div className="de-messages" role="status">
        {note && <div className="problems">{note}</div>}
        {problems.length === 0 ? <div className="de-valid">{tr("deckEditor.valid")}</div> : problems.map((p, k) => <div key={k} className="problems">{problemText(db, locale, p)}</div>)}
      </div>
      <div className="de-cols">
        <section className="de-deck">
          <h3>{tr("deckEditor.deck")}</h3>
          <div className="de-fixed">
            <small>{tr("deckEditor.always")}</small>
            {fixed.map((c) => (
              <span key={c.code} className="de-fixed-card">{nameOf(c)}</span>
            ))}
          </div>
          {TYPES.map((type) => {
            const rows = inDeck(type);
            if (!rows.length) return null;
            return (
              <div key={type} className="de-group">
                <h4>{tr(`deckEditor.${type}`)}</h4>
                {rows.map(({ card, n }) => (
                  <div key={card.code} className="de-row" data-card-code={card.code}>
                    <span className="de-cost">{costOf(card)}</span>
                    <span className="de-name">{nameOf(card)}</span>
                    <Chips card={card} />
                    <b className="de-copies">×{n}</b>
                    <button aria-label={tr("deckEditor.remove", { card: nameOf(card) })} title={tr("deckEditor.remove", { card: nameOf(card) })} onClick={() => push({ op: "remove", code: card.code })}>
                      −
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
        </section>
        <section className="de-pool">
          <h3>{tr("deckEditor.pool", { n: pool.length })}</h3>
          <input type="search" value={query} placeholder={tr("deckEditor.search")} onChange={(e) => setQuery(e.target.value)} aria-label={tr("deckEditor.search")} />
          {TYPES.map((type) => {
            const rows = shown.filter((c) => c.type === type);
            if (!rows.length) return null;
            return (
              <div key={type} className="de-group">
                <h4>{tr(`deckEditor.${type}`)}</h4>
                {rows.map((card) => (
                  <div key={card.code} className="de-row" data-card-code={card.code}>
                    <span className="de-cost">{costOf(card)}</span>
                    <span className="de-name">{nameOf(card)}</span>
                    <Chips card={card} />
                    <b className="de-copies">{deck.cards[card.code] ? `×${deck.cards[card.code]}` : ""}</b>
                    <button aria-label={tr("deckEditor.add", { card: nameOf(card) })} title={tr("deckEditor.add", { card: nameOf(card) })} onClick={() => push({ op: "add", code: card.code })}>
                      +
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
        </section>
      </div>
      <footer className="de-foot">
        <input type="text" className="de-name-input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} aria-label={tr("deckEditor.name")} />
        <button onClick={onCancel}>{tr("deckEditor.cancel")}</button>
        <button className="primary" disabled={problems.length > 0 || !name.trim()} onClick={() => onSave(saveCustomDeck(db, safeStorage(), { name: name.trim(), investigator, base: baseId, ops }))}>
          {tr("deckEditor.save")}
        </button>
      </footer>
    </div>
  );
}
