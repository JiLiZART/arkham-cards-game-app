import type { MouseEvent as ReactMouseEvent } from "react";
import { cardText, t } from "../../content/i18n";
import { actClueCost, doomInPlay } from "../../engine/rules/scenario";
import type { GameState, InstId } from "../../engine/types";
import { CardFace } from "../CardFace";
import { useCardClick } from "../cardClick";
import { groupTokens } from "../chaos";
import { db, gameStore, useGame } from "../context";
import { Icon } from "../Icon";
import { iconUrl } from "../icons";
import { backUrl, isEncounterCard } from "../images";
import { handVisible } from "../scene/Table";
import { viewerOf } from "../store";
import { TokenBadges } from "../TokenBadges";
import { useView } from "../view";
import { ChaosTokenIcon } from "./ChaosTokenIcon";
import { Modal } from "./Modals";

const tr = (key: string, vars?: Record<string, string | number>) => t(db, gameStore.getState().locale, key, vars);
const gOf = () => ({ s: gameStore.getState().game!, db, events: [] });

/** hovering an HTML card shows the enlarged copy over it */
const hoverProps = (id: InstId | null) => ({
  onMouseEnter: (e: ReactMouseEvent<HTMLElement>) => id && useView.getState().setHover(id, e.currentTarget.getBoundingClientRect()),
  onMouseLeave: () => useView.getState().setHover(null),
});

/** a small HTML card: its scan (or the card back), tokens, highlight when it has options */
export function MiniCard({ id, w, h, legal, exhausted, onClick, faceDown }: { id: InstId; w: number; h: number; legal?: boolean; exhausted?: boolean; faceDown?: boolean; onClick?: (e: ReactMouseEvent) => void }) {
  const game = useGame((s) => s.game) as GameState;
  const locale = useGame((s) => s.locale);
  const inst = game.cards[id];
  if (!inst) return null;
  const d = db.cards[inst.code];
  return (
    <button
      className={`mini-card ${legal ? "legal" : ""} ${exhausted ? "exhausted" : ""}`}
      data-card={id}
      style={{ width: w, height: h }}
      onClick={onClick}
      title={faceDown ? undefined : cardText(db, inst.code, locale).name}
      {...(faceDown ? {} : hoverProps(id))}
    >
      {faceDown ? <img src={backUrl(isEncounterCard(d) ? "encounter" : "player")} alt="" draggable={false} /> : <CardFace code={inst.code} locale={locale} />}
      <TokenBadges inst={inst} size={20} />
    </button>
  );
}

/** act and agenda, small and the right way up, top-left; a click shows both sides */
export function ScenarioPanel() {
  const game = useGame((s) => s.game) as GameState;
  const { byCard } = useCardClick();
  const g = gOf();
  const open = (id: InstId) => useView.getState().setModal({ card: id });
  const agendaDef = game.agenda ? db.cards[game.cards[game.agenda].code] : null;
  const cost = actClueCost(g);
  return (
    <div className="scenario-panel">
      {game.agenda && (
        <div className="scenario-card">
          <MiniCard id={game.agenda} w={170} h={122} legal={byCard.has(game.agenda)} onClick={() => open(game.agenda!)} />
          <span className="scenario-badge" title={`${tr("stat.doom")} ${doomInPlay(g)} / ${agendaDef?.doom ?? "?"}`}>
            <Icon name="doom" size={22} /> <b>{doomInPlay(g)}</b>
            <small>/{agendaDef?.doom ?? "?"}</small>
          </span>
        </div>
      )}
      {game.act && (
        <div className="scenario-card">
          <MiniCard id={game.act} w={170} h={122} legal={byCard.has(game.act)} onClick={() => open(game.act!)} />
          {Number.isFinite(cost) && (
            <span className="scenario-badge" title={`${tr("stat.clues")} ${cost}`}>
              <Icon name="clue" size={22} /> <b>{cost}</b>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function Pile({ label, count, top, faceUp, kind }: { label: string; count: number; top: InstId | null; faceUp: boolean; kind: "player" | "encounter" }) {
  const locale = useGame((s) => s.locale);
  const game = useGame((s) => s.game) as GameState;
  const showTop = faceUp && top && game.cards[top];
  return (
    <div className="pile" title={`${label}: ${count}`}>
      <button
        className={`pile-card ${count === 0 ? "empty" : ""}`}
        disabled={!showTop}
        onClick={() => showTop && useView.getState().setModal({ card: top! })}
        {...(showTop ? hoverProps(top) : {})}
      >
        {count > 0 && (showTop ? <CardFace code={game.cards[top!].code} locale={locale} /> : <img src={backUrl(kind)} alt="" draggable={false} />)}
        <span className="pile-count">{count}</span>
      </button>
      <span className="pile-name">{label}</span>
    </div>
  );
}

/** encounter deck, discard, victory, side decks, then the viewer's deck and discard, down the left side */
export function PileColumn() {
  const game = useGame((s) => s.game) as GameState;
  const viewer = viewerOf(game);
  const me = viewer ? game.invs[viewer] : null;
  const victory = Object.values(game.cards).filter((c) => c.zone === "victory");
  return (
    <div className="pile-column">
      <Pile label={tr("pile.encounter")} count={game.encounterDeck.length} top={game.encounterDeck[0] ?? null} faceUp={false} kind="encounter" />
      <Pile label={tr("pile.discard")} count={game.encounterDiscard.length} top={game.encounterDiscard.at(-1) ?? null} faceUp kind="encounter" />
      <Pile label={tr("pile.victory")} count={victory.length} top={victory.at(-1)?.id ?? null} faceUp kind="encounter" />
      {Object.entries(game.sideDecks).map(([name, deck]) => (
        <Pile key={name} label={`${name[0].toUpperCase()}${name.slice(1)}`} count={deck.length} top={deck[0] ?? null} faceUp={false} kind="encounter" />
      ))}
      {me && (
        <>
          <div className="pile-divider" />
          <Pile label={tr("pile.deck")} count={me.deck.length} top={me.deck[0] ?? null} faceUp={false} kind="player" />
          <Pile label={tr("pile.discard")} count={me.discard.length} top={me.discard.at(-1) ?? null} faceUp kind="player" />
        </>
      )}
    </div>
  );
}

/** the chaos bag, top-right corner; a click lists its tokens */
export function ChaosBagButton() {
  const count = useGame((s) => s.game?.chaosBag.length ?? 0);
  return (
    <button className="chaos-bag" id="chaos-bag" onClick={() => useView.getState().setModal({ bag: true })} title={`${tr("bag.title")}: ${count}`}>
      <img src={iconUrl("chaosBag")} alt="" draggable={false} />
      <span className="pile-count">{count}</span>
    </button>
  );
}

/** every token in the bag with its count, next to the scenario reference card for the difficulty */
export function ChaosBagModal() {
  const game = useGame((s) => s.game) as GameState;
  const locale = useGame((s) => s.locale);
  const close = () => useView.getState().setModal(null);
  const ref = db.scenarios[game.scenarioId].card;
  const side = game.difficulty === "hard" || game.difficulty === "expert" ? "back" : "front";
  return (
    <Modal onClose={close} className="bag-modal">
      <div className="bag-tokens">
        <h2 className="card-name">
          {tr("bag.title")} · {game.chaosBag.length}
        </h2>
        <div className="bag-grid">
          {groupTokens(game.chaosBag).map(([tok, n]) => (
            <div key={tok} className="bag-token" title={`${tok} ×${n}`}>
              <ChaosTokenIcon token={tok} size={56} />
              <b>×{n}</b>
            </div>
          ))}
        </div>
        <button className="modal-close" onClick={close}>
          {tr("modal.close")}
        </button>
      </div>
      {ref && db.cards[ref] && (
        <div className="bag-reference">
          <CardFace code={ref} locale={locale} side={side} />
        </div>
      )}
    </Modal>
  );
}

/** the viewer's cards in play, then (after a separator) their threat area and engaged enemies, above the hand */
export function PlayStrip() {
  const game = useGame((s) => s.game) as GameState;
  const privacy = useGame((s) => s.privacy);
  const revealedFor = useGame((s) => s.revealedFor);
  const { byCard, click } = useCardClick();
  const viewer = viewerOf(game);
  if (!viewer || !handVisible(privacy, game.order.length, viewer, revealedFor)) return null;
  const all = Object.values(game.cards);
  const assets = all.filter((c) => c.zone === "play" && c.controller === viewer);
  const threats = [...all.filter((c) => c.zone === "threat" && c.controller === viewer), ...all.filter((c) => c.zone === "enemy" && c.engagedWith === viewer)];
  if (!assets.length && !threats.length) return null;
  const card = (id: InstId, exhausted: boolean) => (
    <div key={id} className={`strip-slot ${exhausted ? "exhausted" : ""}`}>
      <MiniCard id={id} w={96} h={134} legal={byCard.has(id)} exhausted={exhausted} onClick={(e) => click(id, e.clientX, e.clientY)} />
    </div>
  );
  return (
    <div className="play-strip">
      {assets.map((c) => card(c.id, c.exhausted))}
      {threats.length > 0 && assets.length > 0 && <div className="strip-divider" />}
      {threats.map((c) => card(c.id, c.exhausted))}
    </div>
  );
}
