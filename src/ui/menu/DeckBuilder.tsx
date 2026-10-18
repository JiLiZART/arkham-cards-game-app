import { useEffect, useMemo, useState } from "react";
import { loadAllPacks } from "../../content";
import { cardText, t } from "../../content/i18n";
import type { CardDef, DeckDef } from "../../content/schema";
import { needsChoice, validateDeck, whyNot } from "../../engine/decks";
import { deckChangeCost } from "../../engine/upgrade";
import { Chips } from "../catalog/Catalog";
import { db, gameStore, useGame } from "../context";
import { basicWeaknesses, builderPool, changeCopies, defaultDeckName, problemText, saveCustomDeck, withWeakness, type PoolFilter, type SavedDeck } from "../decks";
import { chipsFor } from "../glance";
import { Glyph, Icon } from "../Icon";
import { isIcon } from "../icons";
import { safeStorage } from "../store";
import { Avatar } from "./Avatar";

const tr = (key: string, vars?: Record<string, string | number>) => t(db, gameStore.getState().locale, key, vars);
const TYPES = ["asset", "event", "skill"] as const;
const PAGE = 60;

/** a card's glance chips, inline in a list row */
function Chips2({ card }: { card: CardDef }) {
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

/** how the builder is used: making a custom deck for a new game, or spending a campaign investigator's experience */
export type BuilderMode =
  | { kind: "new"; base: string; onSave(d: SavedDeck): void }
  | { kind: "upgrade"; xp: number; before: Record<string, number>; onSave(cards: Record<string, number>): string | null };

/**
 * The deck builder: the deck as a list by type with the signature cards and weakness slot apart, beside the card list
 * (the catalog's, narrowed to what the investigator may take: a "+" for a card that can go in, the reason for the others),
 * the deck's validation in plain words as it changes, and the name. Save is disabled while the deck is invalid; in
 * upgrade mode also while the experience can't pay for it. A starter deck is never changed.
 */
export function DeckBuilder({ investigator, initial, initialName, mode, onCancel }: { investigator: string; initial: DeckDef; initialName?: string; mode: BuilderMode; onCancel: () => void }) {
  const locale = useGame((s) => s.locale);
  const inv = db.investigators[investigator];
  const [ready, setReady] = useState(false);
  const [deck, setDeck] = useState<DeckDef>(initial);
  const [name, setName] = useState(initialName ?? defaultDeckName(db, investigator, locale));
  const [filter, setFilter] = useState<PoolFilter>({ query: "", factions: [], types: [], levels: [] });
  const [shown, setShown] = useState(PAGE);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    loadAllPacks().then(() => live && setReady(true), (e: unknown) => live && (setError(e instanceof Error ? e.message : String(e)), setReady(true)));
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => setShown(PAGE), [filter]);
  const problems = useMemo(() => (ready ? validateDeck(db, deck) : []), [ready, deck]);
  const pool = useMemo(() => (ready ? builderPool(db, locale, investigator, filter) : []), [ready, locale, investigator, filter]);
  const choice = needsChoice(inv);
  const required = new Set([...inv.signatures, ...inv.weaknesses, ...Object.values(inv.alternatives ?? {}).flat()]);
  const nameOf = (c: CardDef) => cardText(db, c.code, locale).name;
  const upgrade = mode.kind === "upgrade" ? mode : null;
  const cost = upgrade ? deckChangeCost(db, investigator, upgrade.before, deck.cards) : 0;
  const poor = !!upgrade && cost > upgrade.xp;
  const size = Object.entries(deck.cards).reduce((n, [c, k]) => n + (required.has(c) || db.cards[c]?.subtype ? 0 : k), 0);
  const chosenWeakness = Object.keys(deck.cards).find((c) => db.cards[c]?.subtype === "basicweakness") ?? "";
  const fixed = [...inv.signatures, ...inv.weaknesses].map((c) => db.cards[c]).filter(Boolean);
  const inDeck = (type: string) =>
    Object.entries(deck.cards)
      .map(([code, n]) => ({ card: db.cards[code], n }))
      .filter((x) => x.card && x.card.type === type && !required.has(x.card.code) && !x.card.subtype)
      .sort((a, b) => nameOf(a.card).localeCompare(nameOf(b.card)) || (a.card.xp ?? 0) - (b.card.xp ?? 0));
  const bump = (code: string, delta: number) => setDeck({ ...deck, cards: changeCopies(deck.cards, code, delta) });
  const level = (c: CardDef) => (c.xp ? ` (${c.xp})` : "");

  if (choice)
    return (
      <div className="deck-editor">
        <header className="de-head">
          <Avatar code={investigator} size={56} />
        </header>
        <div className="problems" role="status">
          {problemText(db, locale, { message: choice.key, reason: { ...choice, vars: { inv: investigator } } })}
        </div>
        <footer className="de-foot">
          <button onClick={onCancel}>{tr("deckEditor.cancel")}</button>
        </footer>
      </div>
    );

  const save = () => {
    if (mode.kind === "new") mode.onSave(saveCustomDeck(db, safeStorage(), { name: name.trim(), investigator, base: mode.base, cards: deck.cards, randomBasicWeakness: deck.randomBasicWeakness }));
    else setError(mode.onSave(deck.cards));
  };

  return (
    <div className="deck-editor">
      <header className="de-head">
        <Avatar code={investigator} size={56} />
        <div className="de-status">
          <b className={problems.length ? "bad" : "ok"}>{tr("deckEditor.size", { n: size, size: inv.deckSize })}</b>
          {upgrade && <span className={poor ? "bad" : ""}>{tr("upgrade.xp", { left: upgrade.xp - cost, cost, have: upgrade.xp })}</span>}
        </div>
        {!upgrade && (
          <label className="de-weakness">
            {tr("deckEditor.weakness")}
            <select value={chosenWeakness} onChange={(e) => setDeck(withWeakness(db, deck, e.target.value || null))}>
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
      <div className="de-messages" role="status">
        {!ready && <div>{tr("catalog.loading", { done: 0, total: Object.keys(db.packs).length })}</div>}
        {error && <div className="problems">{error}</div>}
        {poor && <div className="problems">{tr("upgrade.cost", { need: cost, have: upgrade!.xp })}</div>}
        {ready && (problems.length === 0 ? <div className="de-valid">{tr("deckEditor.valid")}</div> : problems.map((p, k) => <div key={k} className="problems">{problemText(db, locale, p)}</div>))}
      </div>
      <div className="de-cols">
        <div className="de-deck">
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
                    <span className="de-name">{nameOf(card)}{level(card)}</span>
                    <Chips2 card={card} />
                    <b className="de-copies">×{n}</b>
                    <button aria-label={tr("deckEditor.remove", { card: nameOf(card) })} title={tr("deckEditor.remove", { card: nameOf(card) })} onClick={() => bump(card.code, -1)}>
                      −
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        <div className="de-pool">
          <h3>{tr("deckEditor.pool", { n: pool.length })}</h3>
          <input type="search" value={filter.query} placeholder={tr("deckEditor.search")} onChange={(e) => setFilter({ ...filter, query: e.target.value })} aria-label={tr("deckEditor.search")} />
          <Chips label={tr("catalog.type")} on={filter.types} set={(types) => setFilter({ ...filter, types })} options={TYPES.map((x) => ({ value: x as string, label: tr(`card.type.${x}`) }))} />
          <Chips label={tr("catalog.level")} on={filter.levels} set={(levels) => setFilter({ ...filter, levels })} options={[0, 1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }))} />
          {pool.slice(0, shown).map((card) => {
            const why = whyNot(db, deck, card.code);
            return (
              <div key={card.code} className={`de-row ${why ? "blocked" : ""}`} data-card-code={card.code}>
                <span className="de-cost">{costOf(card)}</span>
                <span className="de-name">
                  {nameOf(card)}
                  {level(card)}
                  {why && <small className="de-why"> {problemText(db, locale, { message: why.key, reason: why })}</small>}
                </span>
                <Chips2 card={card} />
                <b className="de-copies">{deck.cards[card.code] ? `×${deck.cards[card.code]}` : ""}</b>
                <button disabled={!!why} aria-label={tr("deckEditor.add", { card: nameOf(card) })} title={tr("deckEditor.add", { card: nameOf(card) })} onClick={() => bump(card.code, 1)}>
                  +
                </button>
              </div>
            );
          })}
          {shown < pool.length && (
            <button className="link-btn" onClick={() => setShown(shown + PAGE)}>
              {tr("catalog.more", { n: shown, total: pool.length })}
            </button>
          )}
        </div>
      </div>
      <footer className="de-foot">
        {mode.kind === "new" && <input type="text" className="de-name-input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} aria-label={tr("deckEditor.name")} />}
        <button onClick={onCancel}>{tr("deckEditor.cancel")}</button>
        <button className="primary" disabled={!ready || problems.length > 0 || poor || (mode.kind === "new" && !name.trim())} onClick={save}>
          {upgrade ? tr("upgrade.save", { n: cost }) : tr("deckEditor.save")}
        </button>
      </footer>
    </div>
  );
}
