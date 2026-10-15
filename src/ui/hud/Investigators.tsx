import { useLayoutEffect, useRef } from "react";
import { cardText, t } from "../../content/i18n";
import type { GameState, InstId, InvId } from "../../engine/types";
import { domPlace, lastRects, originRect, takeArrival } from "../arrivals";
import { CardFace } from "../CardFace";
import { backUrl } from "../images";
import { db, gameStore, useGame } from "../context";
import { optionHome, optionOwner } from "../optionHome";
import { Portrait } from "../Portrait";
import { viewerOf } from "../store";
import { useView } from "../view";
import { flyGhost, STAGGER_MS } from "./flights";
import { Modal, OptionButtons, useCardOptions } from "./Modals";
import { RESOLVE_BOX } from "./Reveal";
import { FlashStat, invNumbers, StatBody } from "./Stats";

const tr = (key: string, vars?: Record<string, string | number>) => t(db, gameStore.getState().locale, key, vars);

/** every card of an investigator shown in their modal: investigator card, hand, play area, threat area */
function cardsOf(game: GameState, i: InvId) {
  const all = Object.values(game.cards);
  return {
    hand: game.invs[i].hand,
    play: all.filter((c) => c.zone === "play" && c.controller === i).map((c) => c.id),
    threat: [
      ...all.filter((c) => c.zone === "threat" && c.controller === i),
      ...all.filter((c) => c.zone === "enemy" && c.engagedWith === i),
    ].map((c) => c.id),
  };
}

/** pending options that belong in this investigator's modal */
function useInvOptions(i: InvId) {
  const game = useGame((s) => s.game) as GameState;
  const c = cardsOf(game, i);
  const viewer = viewerOf(game);
  return useCardOptions([game.invs[i].cardId, ...c.hand, ...c.play, ...c.threat]).filter((o) => optionHome(o, game, viewer) === "invModal" && optionOwner(o, game) === i);
}

/** the other investigators, down the right edge: portrait with clue, resource, health and sanity counts */
export function InvTokens() {
  const game = useGame((s) => s.game) as GameState;
  const viewer = viewerOf(game);
  const others = game.order.filter((i) => i !== viewer);
  if (!others.length) return null;
  return (
    <div className="inv-tokens">
      {others.map((i) => (
        <InvToken key={i} inv={i} />
      ))}
    </div>
  );
}

function InvToken({ inv }: { inv: InvId }) {
  const game = useGame((s) => s.game) as GameState;
  const locale = useGame((s) => s.locale);
  const setup = useGame((s) => s.setup);
  const ref = useRef<HTMLButtonElement>(null);
  // cards arriving in this (hidden) hand: a face-down card flies to the token; the face is never shown
  const known = useRef<{ setup: unknown; ids: Set<InstId> }>({ setup, ids: new Set(game.invs[inv].hand) });
  useLayoutEffect(() => {
    if (known.current.setup !== setup) known.current = { setup, ids: new Set() };
    const el = ref.current;
    const hand = game.invs[inv].hand;
    for (const id of hand) {
      if (known.current.ids.has(id)) continue;
      known.current.ids.add(id);
      const a = takeArrival(id);
      if (!a || !el) continue;
      const r = el.getBoundingClientRect();
      const from = originRect(a, viewerOf(game), (p) => domPlace(p, RESOLVE_BOX), (i) => lastRects.get(i) ?? null, innerWidth, innerHeight);
      flyGhost(backUrl("player"), from, { x: r.left, y: r.top, w: r.width, h: r.height }, a.batch * STAGGER_MS);
    }
    for (const id of known.current.ids) if (!hand.includes(id)) known.current.ids.delete(id);
  });
  const options = useInvOptions(inv);
  const n = invNumbers(game, inv);
  const st = game.invs[inv];
  const name = cardText(db, inv, locale).name;
  return (
    <button
      ref={ref}
      className={`inv-token ${game.active === inv ? "active" : ""} ${options.length ? "legal" : ""} ${st.status}`}
      onClick={() => useView.getState().setModal({ inv })}
      title={st.status !== "playing" ? `${name} (${st.status})` : name}
    >
      <Portrait code={inv} size={64} active={game.active === inv} />
      <span className="inv-counts">
        <FlashStat icon="clue" value={n.clues} size={22} label={tr("stat.clues")} />
        <FlashStat icon="resource" value={n.resources} size={22} label={tr("stat.resources")} />
        <FlashStat icon="health" value={n.health} max={n.maxHealth} size={22} label={tr("stat.health")} />
        <FlashStat icon="sanity" value={n.sanity} max={n.maxSanity} size={22} label={tr("stat.sanity")} />
      </span>
    </button>
  );
}

function CardRow({ title, ids }: { title: string; ids: InstId[] }) {
  const game = useGame((s) => s.game) as GameState;
  const locale = useGame((s) => s.locale);
  if (!ids.length) return null;
  return (
    <section className="inv-row">
      <h3>
        {title} · {ids.length}
      </h3>
      <div className="inv-cards">
        {ids.map((id) => (
          <button key={id} className="card-btn" onClick={() => useView.getState().setModal({ card: id })} title={cardText(db, game.cards[id].code, locale).name}>
            <CardFace code={game.cards[id].code} locale={locale} />
          </button>
        ))}
      </div>
    </section>
  );
}

/** another investigator: stats like the stat bar, their investigator card, hand, play area, threat area and options */
export function InvModal({ inv }: { inv: InvId }) {
  const game = useGame((s) => s.game) as GameState;
  const locale = useGame((s) => s.locale);
  const options = useInvOptions(inv);
  const close = () => useView.getState().setModal(null);
  if (!game.invs[inv]) return null;
  const c = cardsOf(game, inv);
  const cardId = game.invs[inv].cardId;
  return (
    <Modal onClose={close} className="inv-modal">
      <div className="inv-head">
        <div className="inv-stats">
          <StatBody inv={inv} />
        </div>
        <button className="card-btn landscape" onClick={() => useView.getState().setModal({ card: cardId })} title={cardText(db, inv, locale).name}>
          <CardFace code={inv} locale={locale} />
        </button>
        <div className="inv-actions">
          <OptionButtons options={options} onChosen={close} />
          <button className="modal-close" onClick={close}>{tr("modal.close")}</button>
        </div>
      </div>
      <CardRow title={tr("modal.hand")} ids={c.hand} />
      <CardRow title={tr("modal.inPlay")} ids={c.play} />
      <CardRow title={tr("modal.threat")} ids={c.threat} />
    </Modal>
  );
}
