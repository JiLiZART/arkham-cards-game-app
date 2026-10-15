import { useLayoutEffect, useRef, type MouseEvent as ReactMouseEvent } from "react";
import { cardText, t } from "../../content/i18n";
import { actClueCost, doomInPlay } from "../../engine/rules/scenario";
import type { GameState, InstId } from "../../engine/types";
import { rememberRect } from "../arrivals";
import { CardFace } from "../CardFace";
import { useCardClick } from "../cardClick";
import { groupTokens } from "../chaos";
import { db, gameStore, useGame } from "../context";
import { Icon } from "../Icon";
import { introHides } from "../intro";
import { iconUrl } from "../icons";
import { backUrl, isEncounterCard } from "../images";
import { handVisible } from "../scene/Table";
import { viewerOf } from "../store";
import { TokenBadges } from "../TokenBadges";
import { useView } from "../view";
import { ChaosTokenIcon } from "./ChaosTokenIcon";
import { referenceSide } from "./DeckViewer";
import { useFlyIn } from "./flights";
import { Modal, useCardOptions } from "./Modals";
import { RESOLVE_BOX } from "./Reveal";
import { stripAction } from "./ActionRail";

const tr = (key: string, vars?: Record<string, string | number>) => t(db, gameStore.getState().locale, key, vars);
const gOf = () => ({ s: gameStore.getState().game!, db, events: [] });

/** hovering an HTML card shows the enlarged copy over it */
const hoverProps = (id: InstId | null) => ({
  onMouseEnter: (e: ReactMouseEvent<HTMLElement>) => id && useView.getState().setHover(id, e.currentTarget.getBoundingClientRect()),
  onMouseLeave: () => useView.getState().setHover(null),
});

/** a small HTML card: its scan (or the card back), tokens, highlight when it has options */
export function MiniCard({ id, w, h, legal, exhausted, target, onClick, faceDown }: { id: InstId; w: number | string; h: number | string; legal?: boolean; exhausted?: boolean; target?: boolean; faceDown?: boolean; onClick?: (e: ReactMouseEvent) => void }) {
  const game = useGame((s) => s.game) as GameState;
  const locale = useGame((s) => s.locale);
  const inst = game.cards[id];
  if (!inst) return null;
  const d = db.cards[inst.code];
  return (
    <button
      className={`mini-card ${legal ? "legal" : ""} ${exhausted ? "exhausted" : ""} ${target ? "target" : ""}`}
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

/** options on the act or agenda (Advance act…) as buttons laid over the card; the rest of the card still opens the viewer */
export function CardOptions({ id }: { id: InstId | null }) {
  const choose = useGame((s) => s.choose);
  const options = useCardOptions([id]);
  if (!options.length) return null;
  return (
    <div className="card-options">
      {options.map((o) => (
        <button
          key={o.id}
          className="primary"
          title={o.label}
          onClick={(e) => {
            e.stopPropagation();
            useView.getState().setModal(null);
            choose(o.id);
          }}
        >
          {(o.value as { kind?: string } | null)?.kind === "advanceAct" ? tr("act.advance") : o.label}
        </button>
      ))}
    </div>
  );
}

/** act and agenda, small and the right way up, top-left; a click shows both sides */
export function ScenarioPanel() {
  const game = useGame((s) => s.game) as GameState;
  const locale = useGame((s) => s.locale);
  const { byCard } = useCardClick();
  const g = gOf();
  const open = (deck: "act" | "agenda" | "reference") => useView.getState().setModal({ deck });
  const ref = db.scenarios[game.scenarioId].card;
  const agendaDef = game.agenda ? db.cards[game.cards[game.agenda].code] : null;
  const cost = actClueCost(g);
  // during the mulligan and the introduction the cards keep their place (the introduction flies them there) but hide
  const hides = introHides(game, useView((s) => s.intro?.step));
  return (
    <div className="scenario-panel">
      {game.agenda && (
        <div className={`scenario-card ${hides.agenda ? "intro-hidden" : ""}`}>
          <MiniCard id={game.agenda} w={170} h={122} legal={byCard.has(game.agenda)} onClick={() => open("agenda")} />
          <CardOptions id={game.agenda} />
          <span className="scenario-badge" title={`${tr("stat.doom")} ${doomInPlay(g)} / ${agendaDef?.doom ?? "?"}`}>
            <Icon name="doom" size={22} /> <b>{doomInPlay(g)}</b>
            <small>/{agendaDef?.doom ?? "?"}</small>
          </span>
        </div>
      )}
      {game.act && (
        <div className={`scenario-card ${hides.act ? "intro-hidden" : ""}`}>
          <MiniCard id={game.act} w={170} h={122} legal={byCard.has(game.act)} onClick={() => open("act")} />
          <CardOptions id={game.act} />
          {Number.isFinite(cost) && (
            <span className="scenario-badge" title={`${tr("stat.clues")} ${cost}`}>
              <Icon name="clue" size={22} /> <b>{cost}</b>
            </span>
          )}
        </div>
      )}
      {ref && db.cards[ref] && (
        <div className={`scenario-card ${hides.act ? "intro-hidden" : ""}`}>
          <button className="mini-card scenario-ref" style={{ width: 86, height: 122 }} onClick={() => open("reference")} title={tr("viewer.reference")}>
            <CardFace code={ref} locale={locale} side={referenceSide(game)} />
          </button>
        </div>
      )}
    </div>
  );
}

function Pile({ label, count, top, faceUp, kind, id }: { label: string; count: number; top: InstId | null; faceUp: boolean; kind: "player" | "encounter"; id?: string }) {
  const locale = useGame((s) => s.locale);
  const game = useGame((s) => s.game) as GameState;
  const showTop = faceUp && top && game.cards[top];
  return (
    <div className="pile" data-pile={id} title={`${label}: ${count}`}>
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
      <Pile label={tr("pile.encounter")} count={game.encounterDeck.length} top={game.encounterDeck[0] ?? null} faceUp={false} kind="encounter" id="encounter" />
      <Pile label={tr("pile.discard")} count={game.encounterDiscard.length} id="encounterDiscard" top={game.encounterDiscard.at(-1) ?? null} faceUp kind="encounter" />
      <Pile label={tr("pile.victory")} count={victory.length} top={victory.at(-1)?.id ?? null} faceUp kind="encounter" />
      {Object.entries(game.sideDecks).map(([name, deck]) => (
        <Pile key={name} label={`${name[0].toUpperCase()}${name.slice(1)}`} count={deck.length} top={deck[0] ?? null} faceUp={false} kind="encounter" />
      ))}
      {me && (
        <>
          <div className="pile-divider" />
          <Pile label={tr("pile.deck")} id="deck" count={me.deck.length} top={me.deck[0] ?? null} faceUp={false} kind="player" />
          <Pile label={tr("pile.discard")} id="discard" count={me.discard.length} top={me.discard.at(-1) ?? null} faceUp kind="player" />
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

/** strip card width: full size, smaller when the strip is crowded (px) */
const STRIP_W = 124;
const STRIP_MIN_W = 84;
const STRIP_GAP = 8;

/** the widest strip card that lets every slot (exhausted ones lie sideways) fit in `room` px */
export function stripCardWidth(room: number, upright: number, sideways: number, dividers: number): number {
  const units = upright + sideways * 1.4;
  const gaps = (upright + sideways + dividers * 2 - 1) * STRIP_GAP + dividers * 14;
  return Math.max(STRIP_MIN_W, Math.min(STRIP_W, Math.floor((room - gaps) / Math.max(units, 1))));
}

/**
 * The viewer's cards in play, then (after a separator) their threat area and engaged enemies, above the hand.
 * A card's pending options sit on it as buttons (Fight / Evade on an engaged enemy); the test's target is outlined.
 */
export function PlayStrip() {
  const game = useGame((s) => s.game) as GameState;
  const locale = useGame((s) => s.locale);
  const privacy = useGame((s) => s.privacy);
  const revealedFor = useGame((s) => s.revealedFor);
  const choose = useGame((s) => s.choose);
  const { byCard } = useCardClick();
  const viewer = viewerOf(game);
  const strip = useRef<HTMLDivElement>(null);
  const setup = useGame((s) => s.setup);
  const visible = !!viewer && handVisible(privacy, game.order.length, viewer, revealedFor);
  // new strip cards fly in from where they came from (before their rects are remembered below)
  useFlyIn(strip, visible, viewer, privacy && game.order.length > 1, RESOLVE_BOX, setup);
  const all = Object.values(game.cards);
  const assets = all.filter((c) => c.zone === "play" && c.controller === viewer);
  const threats = [...all.filter((c) => c.zone === "threat" && c.controller === viewer), ...all.filter((c) => c.zone === "enemy" && c.engagedWith === viewer)];
  const shown = [...assets, ...threats];
  // size the cards to the room the strip has, then remember where each card is (a card leaving flies from there)
  useLayoutEffect(() => {
    const el = strip.current;
    if (!el) return;
    const sideways = shown.filter((c) => c.exhausted).length;
    const w = stripCardWidth(el.clientWidth, shown.length - sideways, sideways, assets.length && threats.length ? 1 : 0);
    el.style.setProperty("--sw", `${w}px`);
    el.querySelectorAll<HTMLElement>("[data-card]").forEach((c) => rememberRect(c.dataset.card!, c));
  });
  if (!visible || !shown.length) return null;
  const target = game.skillTest?.target ?? null;
  const card = (id: InstId, exhausted: boolean) => {
    const opts = byCard.get(id) ?? [];
    const name = cardText(db, game.cards[id].code, locale).name;
    return (
      <div key={id} className={`strip-slot ${exhausted ? "exhausted" : ""}`}>
        {opts.length > 0 && (
          <div className="strip-actions">
            {opts.map((o) => {
              const a = stripAction(o, name, locale);
              return (
                <button key={o.id} className="strip-action" onClick={() => choose(o.id)} title={o.label}>
                  {a.icon && <Icon name={a.icon} size={22} />}
                  <span>{a.label}</span>
                </button>
              );
            })}
          </div>
        )}
        <MiniCard
          id={id}
          w="var(--sw)"
          h="calc(var(--sw) * 1.4)"
          legal={opts.length > 0}
          exhausted={exhausted}
          target={id === target}
          // one option: the card itself chooses it; several: the buttons on it do
          onClick={() => opts.length === 1 && choose(opts[0].id)}
        />
      </div>
    );
  };
  return (
    <div className="play-strip" ref={strip}>
      {assets.map((c) => card(c.id, c.exhausted))}
      {threats.length > 0 && assets.length > 0 && <div className="strip-divider" />}
      {threats.map((c) => card(c.id, c.exhausted))}
    </div>
  );
}
