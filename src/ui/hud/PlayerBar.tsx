import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cardText, t } from "../../content/i18n";
import type { GameState, InstId, InvId } from "../../engine/types";
import { domPlace, lastRects, originRect, takeArrival } from "../arrivals";
import { useOptionsByCard } from "../cardClick";
import { db, gameStore, useGame } from "../context";
import { Icon } from "../Icon";
import { backUrl } from "../images";
import { barModel, investigatorOptions, shownInv, type Avatar as AvatarModel } from "../players";
import { Portrait } from "../Portrait";
import { viewerOf } from "../store";
import { useDimmed, useView } from "../view";
import { flyGhost, STAGGER_MS } from "./flights";
import { RESOLVE_BOX } from "./Reveal";
import { StatBody, useFlash } from "./Stats";

const tr = (key: string, vars?: Record<string, string | number>) => t(db, gameStore.getState().locale, key, vars);

function Count({ icon, value, label }: { icon: "health" | "sanity"; value: number; label: string }) {
  const flash = useFlash(value);
  return (
    <span className={`pb-count ${flash ? "flash" : ""}`} title={`${label} ${value}`}>
      <Icon name={icon} size={16} title="" />
      <b>{value}</b>
    </span>
  );
}

/** a card arriving in a hand that isn't on screen: a face-down card flies to that investigator's avatar */
function useGhostDraws(inv: InvId, ref: React.RefObject<HTMLElement>, skip: boolean) {
  const game = useGame((s) => s.game) as GameState;
  const setup = useGame((s) => s.setup);
  const known = useRef<{ setup: unknown; ids: Set<InstId> }>({ setup, ids: new Set(game.invs[inv].hand) });
  useLayoutEffect(() => {
    if (known.current.setup !== setup) known.current = { setup, ids: new Set() };
    const el = ref.current;
    const hand = game.invs[inv].hand;
    for (const id of hand) {
      if (known.current.ids.has(id)) continue;
      known.current.ids.add(id);
      const a = takeArrival(id);
      if (skip || !a || !el) continue;
      const r = el.getBoundingClientRect();
      const from = originRect(a, viewerOf(game), (p) => domPlace(p, RESOLVE_BOX), (i) => lastRects.get(i) ?? null, innerWidth, innerHeight);
      flyGhost(backUrl("player"), from, { x: r.left, y: r.top, w: r.width, h: r.height }, a.batch * STAGGER_MS);
    }
    for (const id of known.current.ids) if (!hand.includes(id)) known.current.ids.delete(id);
  });
}

function AvatarButton({ a, legal, onTap }: { a: AvatarModel; legal: boolean; onTap: (el: HTMLElement) => void }) {
  const locale = useGame((s) => s.locale);
  const ref = useRef<HTMLButtonElement>(null);
  const dimmed = useDimmed(a.inv);
  useGhostDraws(a.inv, ref, a.shown);
  const name = cardText(db, a.inv, locale).name;
  const label = a.canAct ? tr(a.canAct, { name }) : null;
  return (
    <button
      ref={ref}
      data-inv={a.inv}
      data-tip={a.shown ? "portrait" : undefined}
      className={`pb-avatar ${a.active ? "active" : ""} ${a.shown ? "shown" : ""} ${a.grey ? "grey" : ""} ${a.turn === "done" ? "done" : ""} ${legal ? "legal" : ""} ${a.canAct ? "pulse" : ""} ${dimmed ? "dimmed" : ""}`}
      onClick={() => onTap(ref.current!)}
      title={label ?? (a.grey ? `${name} ✕` : name)}
      aria-pressed={a.shown}
    >
      <span className="pb-top">
        <Portrait code={a.inv} size={36} active={a.active} title={name} />
        {a.pips > 0 && (
          <span className="pips pb-pips">
            {Array.from({ length: a.pips }, (_, k) => (
              <i key={k} className={`pip ${k < a.filled ? "filled" : ""}`} />
            ))}
          </span>
        )}
      </span>
      <span className="pb-counts">
        <Count icon="health" value={a.health} label={tr("stat.health")} />
        <Count icon="sanity" value={a.sanity} label={tr("stat.sanity")} />
      </span>
      {label && <span className="pb-label">{label}</span>}
    </button>
  );
}

/** the details of the investigator on screen, opened from their avatar: card, ability and its options, skills, resources, clues, hand count */
function Sheet({ inv, anchor, onClose }: { inv: InvId; anchor: DOMRect | null; onClose: () => void }) {
  const game = useGame((s) => s.game) as GameState;
  const cardId = game.invs[inv].cardId;
  const byCard = useOptionsByCard();
  const { abilities } = investigatorOptions(game);
  const options = (byCard.get(cardId) ?? []).filter((o) => abilities.some((x) => x.id === o.id));
  const dimmed = useDimmed(inv);
  const decider = viewerOf(game);
  // outside taps and Escape close it
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const down = (e: PointerEvent) => !(e.target as Element).closest(".pb-sheet, .pb-avatar") && onClose();
    window.addEventListener("keydown", key);
    window.addEventListener("pointerdown", down);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("pointerdown", down);
    };
  }, [onClose]);
  return (
    <div className="pb-sheet" style={{ left: Math.max(8, Math.min((anchor?.left ?? 8), innerWidth - 440)), top: (anchor?.bottom ?? 60) + 6 }}>
      <StatBody inv={inv} legal={options.length > 0} dimmed={dimmed} options={options} onPortrait={() => useView.getState().setModal({ card: cardId })} />
      {inv !== decider && (
        <button className="pb-details" onClick={() => { onClose(); useView.getState().setModal({ inv }); }}>
          {tr("players.details")}
        </button>
      )}
    </div>
  );
}

/**
 * Every investigator in turn order: avatar, health and sanity, action pips on their turn. A tap looks at that
 * investigator (their strip, markers and, when hands aren't private, their hand); a tap on the one on screen opens their
 * sheet; a pulsing avatar is someone who can act now, and a tap hands the device over; an avatar that is an option answers.
 */
export function PlayerBar() {
  const game = useGame((s) => s.game) as GameState;
  const viewing = useView((s) => s.viewing);
  const choose = useGame((s) => s.choose);
  const byCard = useOptionsByCard();
  const [sheet, setSheet] = useState(false);
  const anchor = useRef<DOMRect | null>(null);
  const model = barModel(game, { viewing });
  const decider = viewerOf(game);
  const shown = shownInv(game, { viewing });
  const { answers, abilities } = investigatorOptions(game);
  // an investigator whose own card offers an ability glows too: a tap opens the sheet with its button
  const hasAbility = (inv: InvId) => abilities.some((o) => o.card === game.invs[inv].cardId && byCard.get(o.card!)?.some((x) => x.id === o.id));
  const answerable = (inv: InvId) => {
    const o = answers.get(inv);
    return o && byCard.get(game.invs[inv].cardId)?.some((x) => x.id === o.id) ? o : null;
  };
  const tap = (a: AvatarModel, el: HTMLElement) => {
    const answer = answerable(a.inv);
    if (answer) return choose(answer.id);
    anchor.current = el.getBoundingClientRect();
    // someone who can act: the hand-off to them; the one on screen: their sheet; anyone else: look at them
    if (a.canAct) return useView.getState().setViewing(null), setSheet(false);
    if (a.shown) return setSheet((v) => !v);
    setSheet(false);
    useView.getState().setViewing(a.inv === decider ? null : a.inv);
  };
  // the sheet belongs to the investigator on screen: closed when the view moves on
  useEffect(() => setSheet(false), [shown]);
  if (!model.length) return null;
  return (
    <div className="player-bar">
      {model.map((a) => (
        <AvatarButton key={a.inv} a={a} legal={!!answerable(a.inv) || hasAbility(a.inv)} onTap={(el) => tap(a, el)} />
      ))}
      {shown !== decider && decider && (
        <button className="pb-back" onClick={() => useView.getState().setViewing(null)}>
          {tr("players.back", { name: cardText(db, decider, gameStore.getState().locale).name })}
        </button>
      )}
      {sheet && shown && <Sheet inv={shown} anchor={anchor.current} onClose={() => setSheet(false)} />}
    </div>
  );
}
