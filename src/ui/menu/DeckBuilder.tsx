import { useEffect, useMemo, useState } from "react";
import { loadAllPacks } from "../../content";
import { t } from "../../content/i18n";
import type { DeckDef } from "../../content/schema";
import { needsChoice, validateDeck } from "../../engine/decks";
import { deckChangeCost } from "../../engine/upgrade";
import { db, gameStore, useGame } from "../context";
import { problemText } from "../decks";
import { Avatar } from "./Avatar";
import { DeckEditArea } from "./DeckEditArea";

const tr = (key: string, vars?: Record<string, string | number>) => t(db, gameStore.getState().locale, key, vars);

/**
 * Spending a campaign investigator's experience between scenarios: the deck's editing area (as on the deck step) under a
 * header with the experience left. Save is disabled while the deck breaks the rules or costs more than the experience.
 */
export function DeckBuilder({ investigator, initial, xp, onSave, onCancel }: { investigator: string; initial: DeckDef; xp: number; onSave: (cards: Record<string, number>) => string | null; onCancel: () => void }) {
  const locale = useGame((s) => s.locale);
  const [ready, setReady] = useState(false);
  const [deck, setDeck] = useState<DeckDef>(initial);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    loadAllPacks().then(
      () => live && setReady(true),
      (e: unknown) => live && (setError(e instanceof Error ? e.message : String(e)), setReady(true)),
    );
    return () => {
      live = false;
    };
  }, []);
  const problems = useMemo(() => (ready ? validateDeck(db, deck) : []), [ready, deck]);
  const choice = needsChoice(db.investigators[investigator]);
  const cost = deckChangeCost(db, investigator, initial.cards, deck.cards);
  const poor = cost > xp;
  return (
    <div className="deck-editor">
      <header className="de-head">
        <Avatar code={investigator} size={56} />
        <div className="de-status">
          <span className={poor ? "bad" : ""}>{tr("upgrade.xp", { left: xp - cost, cost, have: xp })}</span>
        </div>
      </header>
      <div className="de-messages" role="status">
        {!ready && <div>{tr("catalog.loading", { done: 0, total: Object.keys(db.packs).length })}</div>}
        {error && <div className="problems">{error}</div>}
        {choice && <div className="problems">{problemText(db, locale, { message: choice.key, reason: { ...choice, vars: { inv: investigator } } })}</div>}
        {poor && <div className="problems">{tr("upgrade.cost", { need: cost, have: xp })}</div>}
        {ready && (problems.length === 0 ? <div className="de-valid">{tr("deckEditor.valid")}</div> : problems.slice(0, 4).map((p, k) => <div key={k} className="problems">{problemText(db, locale, p)}</div>))}
      </div>
      {ready && !choice && <DeckEditArea investigator={investigator} deck={deck} weakness={false} onChange={(cards) => setDeck({ ...deck, cards })} />}
      <footer className="de-foot">
        <button onClick={onCancel}>{tr("deckEditor.cancel")}</button>
        <button className="primary" disabled={!ready || !!choice || problems.length > 0 || poor} onClick={() => setError(onSave(deck.cards))}>
          {tr("upgrade.save", { n: cost })}
        </button>
      </footer>
    </div>
  );
}
