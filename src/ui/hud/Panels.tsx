import { useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { useLayoutMode } from "../layoutMode";
import { tapCard } from "../touch";
import { cardText, t } from "../../content/i18n";
import { actClueCost, doomInPlay } from "../../engine/rules/scenario";
import type { GameState, InstId } from "../../engine/types";
import { rememberRect } from "../arrivals";
import { CardFace } from "../CardFace";
import { useCardClick } from "../cardClick";
import { groupTokens } from "../chaos";
import { db, gameStore, useGame } from "../context";
import { Glyph, Icon } from "../Icon";
import { hasSymbol, scenarioIcon } from "../icons";
import { introHides } from "../intro";
import { backUrl, isEncounterCard } from "../images";
import { handVisible } from "../scene/Table";
import { heldCards, viewerOf } from "../store";
import { useShown } from "../usePlayers";
import { IntentBadge, TokenBadges } from "../TokenBadges";
import { useDimmed, useView } from "../view";
import { heldGame } from "../spotlight";
import { ChaosTokenIcon } from "./ChaosTokenIcon";
import { referenceSide } from "./DeckViewer";
import { useFlyIn } from "./flights";
import { Modal, useCardOptions } from "./Modals";
import { RESOLVE_BOX } from "./Reveal";
import { abilitySymbol, stripAction } from "./ActionRail";
import { moment } from "./SoundLayer";

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
  const dimmed = useDimmed(id);
  const inst = game.cards[id];
  if (!inst) return null;
  const d = db.cards[inst.code];
  return (
    <button
      className={`mini-card ${legal ? "legal" : ""} ${exhausted ? "exhausted" : ""} ${target ? "target" : ""} ${dimmed ? "dimmed" : ""}`}
      data-card={id}
      style={{ width: w, height: h }}
      onClick={onClick}
      title={faceDown ? undefined : cardText(db, inst.code, locale).name}
      {...(faceDown ? {} : hoverProps(id))}
    >
      {faceDown ? <img src={backUrl(isEncounterCard(d) ? "encounter" : "player")} alt="" draggable={false} /> : <CardFace code={inst.code} locale={locale} />}
      <TokenBadges inst={inst} size={20} />
      <IntentBadge inst={inst} />
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
  const refDimmed = useDimmed("reference");
  const agendaDef = game.agenda ? db.cards[game.cards[game.agenda].code] : null;
  const cost = actClueCost(g);
  // during the mulligan and the introduction the cards keep their place (the introduction flies them there) but hide
  const hides = introHides(game, useView((s) => s.intro?.step));
  return (
    <div className="scenario-panel">
      {game.agenda && (
        <div className={`scenario-card ${hides.agenda ? "intro-hidden" : ""}`} data-tip="agenda">
          <MiniCard id={game.agenda} w={170} h={122} legal={byCard.has(game.agenda)} onClick={() => open("agenda")} />
          <CardOptions id={game.agenda} />
          <span className="scenario-badge" title={`${tr("stat.doom")} ${doomInPlay(g)} / ${agendaDef?.doom ?? "?"}`}>
            <Icon name="doom" size={22} /> <b>{doomInPlay(g)}</b>
            <small>/{agendaDef?.doom ?? "?"}</small>
          </span>
        </div>
      )}
      {game.act && (
        <div className={`scenario-card ${hides.act ? "intro-hidden" : ""}`} data-tip="act">
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
          <button className={`mini-card scenario-ref ${refDimmed ? "dimmed" : ""}`} style={{ width: 86, height: 122 }} onClick={() => open("reference")} title={tr("viewer.reference")}>
            <CardFace code={ref} locale={locale} side={referenceSide(game)} />
          </button>
        </div>
      )}
    </div>
  );
}

/** an encounter pile's icon: its top card's set when the top is face up, else the scenario's (a face-down top stays secret) */
export function pileIcon(top: InstId | null, faceUp: boolean, game: Pick<GameState, "scenarioId" | "cards">): string {
  const set = faceUp && top ? db.cards[game.cards[top]?.code]?.encounterSet : undefined;
  return set ?? scenarioIcon(game.scenarioId);
}

function Pile({ label, count, top, faceUp, kind, id }: { label: string; count: number; top: InstId | null; faceUp: boolean; kind: "player" | "encounter"; id?: string }) {
  const locale = useGame((s) => s.locale);
  const game = useGame((s) => s.game) as GameState;
  const showTop = faceUp && top && game.cards[top];
  const dimmed = useDimmed(top ?? "");
  return (
    <div className="pile" data-pile={id} data-tip={id === "deck" ? "deck" : undefined} title={`${label}: ${count}`}>
      <button
        className={`pile-card ${count === 0 ? "empty" : ""} ${dimmed ? "dimmed" : ""}`}
        disabled={!showTop}
        onClick={() => showTop && useView.getState().setModal({ card: top! })}
        {...(showTop ? hoverProps(top) : {})}
      >
        {count > 0 && (showTop ? <CardFace code={game.cards[top!].code} locale={locale} /> : <img src={backUrl(kind)} alt="" draggable={false} />)}
        <span className="pile-count">{count}</span>
        {kind === "encounter" && count > 0 && hasSymbol(pileIcon(top, faceUp, game)) && (
          <span className="pile-set">
            <Glyph name={pileIcon(top, faceUp, game)} size={18} />
          </span>
        )}
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
    <button className="chaos-bag" id="chaos-bag" data-tip="bag" onClick={() => useView.getState().setModal({ bag: true })} title={`${tr("bag.title")}: ${count}`}>
      <Icon name="chaosBag" size={96} title={tr("bag.title")} />
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
  const viewer = useShown();
  const strip = useRef<HTMLDivElement>(null);
  const setup = useGame((s) => s.setup);
  const queue = useGame((s) => s.queue);
  const visible = !!viewer && handVisible(privacy, game.order.length, viewer, revealedFor);
  // the phone (ADR-0005): a column of thumbnails on the right edge; a tap on its handle widens it to readable cards
  const phone = useLayoutMode() === "phone";
  const [open, setOpen] = useState(false);
  // new strip cards fly in from where they came from (before their rects are remembered below)
  useFlyIn(strip, visible, viewer, privacy && game.order.length > 1, RESOLVE_BOX, setup);
  const current = useGame((s) => s.current);
  // an enemy whose move hasn't played yet isn't engaged on screen yet; a card still in (or waiting for) the showcase isn't here yet
  const waiting = heldCards({ current, queue });
  const all = Object.values(heldGame(game, queue).cards).filter((c) => !waiting.has(c.id));
  const assets = all.filter((c) => c.zone === "play" && c.controller === viewer);
  const threats = [...all.filter((c) => c.zone === "threat" && c.controller === viewer), ...all.filter((c) => c.zone === "enemy" && c.engagedWith === viewer)];
  const shown = [...assets, ...threats];
  // an asset new to the strip has just been played: its sound (enemies arriving have their own events)
  const seenAssets = useRef<{ setup: unknown; ids: Set<InstId> } | null>(null);
  useLayoutEffect(() => {
    if (!seenAssets.current || seenAssets.current.setup !== setup) {
      seenAssets.current = { setup, ids: new Set(assets.map((c) => c.id)) };
      return;
    }
    for (const c of assets)
      if (!seenAssets.current.ids.has(c.id)) {
        seenAssets.current.ids.add(c.id);
        moment("play", c.id);
      }
  });
  // size the cards to the room the strip has, then remember where each card is (a card leaving flies from there)
  useLayoutEffect(() => {
    const el = strip.current;
    if (!el) return;
    const sideways = shown.filter((c) => c.exhausted).length;
    const w = phone ? (open ? 104 : 44) : stripCardWidth(el.clientWidth, shown.length - sideways, sideways, assets.length && threats.length ? 1 : 0);
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
              const sym = abilitySymbol(o, game);
              return (
                <button key={o.id} className="strip-action" onClick={() => choose(o.id)} title={o.label}>
                  {sym && <Glyph name={sym} size={18} />}
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
          onClick={(e) => tapCard(id, () => opts.length === 1 && choose(opts[0].id), e.currentTarget.getBoundingClientRect())}
        />
      </div>
    );
  };
  return (
    <div className={`play-strip ${phone ? `column ${open ? "open" : ""}` : ""}`} ref={strip}>
      {phone && (
        <button className="strip-handle" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={tr("phone.strip")} title={tr("phone.strip")}>
          {open ? "›" : "‹"} {shown.length}
        </button>
      )}
      {assets.map((c) => card(c.id, c.exhausted))}
      {threats.length > 0 && assets.length > 0 && <div className="strip-divider" />}
      {threats.map((c) => card(c.id, c.exhausted))}
    </div>
  );
}
