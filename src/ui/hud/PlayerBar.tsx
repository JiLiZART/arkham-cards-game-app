import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cardText, t } from "../../content/i18n";
import type { GameState, InstId, InvId } from "../../engine/types";
import { domPlace, lastRects, originRect, takeArrival } from "../arrivals";
import { useOptionsByCard } from "../cardClick";
import { db, gameStore, useGame } from "../context";
import { Icon } from "../Icon";
import { backUrl } from "../images";
import {
  barModel,
  delayed,
  HOVER_SHEET_MS,
  investigatorOptions,
  SHEET_GRACE_MS,
  sheetFor,
  shownInv,
  type Avatar as AvatarModel,
} from "../players";
import { Portrait } from "../Portrait";
import { viewerOf } from "../store";
import { isTouch } from "../touch";
import { useDimmed, useView } from "../view";
import { flyGhost, STAGGER_MS } from "./flights";
import { RESOLVE_BOX } from "./Reveal";
import { StatBody, useFlash } from "./Stats";

const tr = (key: string, vars?: Record<string, string | number>) =>
  t(db, gameStore.getState().locale, key, vars);

function Count({
  icon,
  value,
  label,
}: {
  icon: "health" | "sanity";
  value: number;
  label: string;
}) {
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
  const known = useRef<{ setup: unknown; ids: Set<InstId> }>({
    setup,
    ids: new Set(game.invs[inv].hand),
  });
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
      const from = originRect(
        a,
        viewerOf(game),
        (p) => domPlace(p, RESOLVE_BOX),
        (i) => lastRects.get(i) ?? null,
        innerWidth,
        innerHeight,
      );
      flyGhost(
        backUrl("player"),
        from,
        { x: r.left, y: r.top, w: r.width, h: r.height },
        a.batch * STAGGER_MS,
      );
    }
    for (const id of known.current.ids) if (!hand.includes(id)) known.current.ids.delete(id);
  });
}

function AvatarButton({
  a,
  legal,
  onTap,
  onEnter,
  onLeave,
}: {
  a: AvatarModel;
  legal: boolean;
  onTap: (el: HTMLElement) => void;
  onEnter: (el: HTMLElement, e: React.PointerEvent) => void;
  onLeave: () => void;
}) {
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
      data-ui="pb-avatar"
      className={`pb-avatar ${a.active ? "active" : ""} ${a.shown ? "shown" : ""} ${a.grey ? "grey" : ""} ${a.turn === "done" ? "done" : ""} ${legal ? "legal" : ""} ${a.canAct ? "pulse" : ""} ${dimmed ? "dimmed" : ""}`}
      onClick={() => onTap(ref.current!)}
      onPointerEnter={(e) => onEnter(ref.current!, e)}
      onPointerLeave={onLeave}
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
function Sheet({
  inv,
  anchor,
  onClose,
  onEnter,
  onLeave,
}: {
  inv: InvId;
  anchor: DOMRect | null;
  onClose: () => void;
  onEnter: () => void;
  onLeave: () => void;
}) {
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
    const down = (e: PointerEvent) =>
      !(e.target as Element).closest('[data-ui="pb-sheet"], [data-ui="pb-avatar"]') && onClose();
    window.addEventListener("keydown", key);
    window.addEventListener("pointerdown", down);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("pointerdown", down);
    };
  }, [onClose]);
  return (
    <div
      className="pb-sheet"
      data-ui="pb-sheet"
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      style={{
        left: Math.max(8, Math.min(anchor?.left ?? 8, innerWidth - 440)),
        top: (anchor?.bottom ?? 60) + 6,
      }}
    >
      <StatBody
        inv={inv}
        legal={options.length > 0}
        dimmed={dimmed}
        options={options}
        onPortrait={() => useView.getState().setModal({ card: cardId })}
      />
      {inv !== decider && (
        <button
          className="pb-details"
          onClick={() => {
            onClose();
            useView.getState().setModal({ inv });
          }}
        >
          {tr("players.details")}
        </button>
      )}
    </div>
  );
}

/**
 * Every investigator in turn order: avatar, health and sanity, action pips on their turn. A click looks at that
 * investigator (their strip, markers and hand) and never opens a sheet; resting the mouse on another investigator's
 * avatar for half a second opens their sheet, which closes when the pointer leaves; with a finger a tap on the one on
 * screen opens their sheet. A pulsing avatar is someone who can act now, and a tap switches to them; an avatar that is an
 * option answers.
 */
export function PlayerBar() {
  const game = useGame((s) => s.game) as GameState;
  const viewing = useView((s) => s.viewing);
  const choose = useGame((s) => s.choose);
  const byCard = useOptionsByCard();
  // a sheet opens from a mouse resting on an avatar (or from a tap on the one on screen with a finger); view state only (ADR-0004)
  const [open, setOpen] = useState<{ inv: InvId; anchor: DOMRect | null } | null>(null);
  const hovered = useRef<InvId | null>(null);
  const cancelOpen = useRef<(() => void) | null>(null);
  const cancelClose = useRef<(() => void) | null>(null);
  const model = barModel(game, { viewing });
  const decider = viewerOf(game);
  const shown = shownInv(game, { viewing });
  const { answers, abilities } = investigatorOptions(game);
  // an investigator whose own card offers an ability glows too: a tap opens the sheet with its button
  const hasAbility = (inv: InvId) =>
    abilities.some(
      (o) => o.card === game.invs[inv].cardId && byCard.get(o.card!)?.some((x) => x.id === o.id),
    );
  const answerable = (inv: InvId) => {
    const o = answers.get(inv);
    return o && byCard.get(game.invs[inv].cardId)?.some((x) => x.id === o.id) ? o : null;
  };
  const clearTimers = () => {
    cancelOpen.current?.();
    cancelClose.current?.();
  };
  const tap = (a: AvatarModel, el: HTMLElement) => {
    const answer = answerable(a.inv);
    if (answer) return choose(answer.id);
    clearTimers();
    // someone who can act: the switch to them; with a finger the one on screen opens their sheet; anyone else: look at them (a click never opens the sheet with a mouse)
    if (a.canAct) return (useView.getState().setViewing(null), setOpen(null));
    if (a.shown)
      return setOpen((o) =>
        o || !isTouch() ? null : { inv: a.inv, anchor: el.getBoundingClientRect() },
      );
    setOpen(null);
    useView.getState().setViewing(a.inv === decider ? null : a.inv);
  };
  // resting the mouse on another investigator's avatar opens their sheet; leaving the avatar and the sheet closes it after a moment
  const enter = (a: AvatarModel, el: HTMLElement, e: React.PointerEvent) => {
    if (e.pointerType === "touch" || isTouch()) return;
    cancelClose.current?.();
    hovered.current = a.inv;
    cancelOpen.current?.();
    cancelOpen.current = delayed(
      HOVER_SHEET_MS,
      () => hovered.current === a.inv,
      () => {
        const inv = sheetFor(hovered.current, shown, HOVER_SHEET_MS);
        if (inv) setOpen({ inv, anchor: el.getBoundingClientRect() });
      },
    );
  };
  const leave = () => {
    hovered.current = null;
    cancelOpen.current?.();
    cancelClose.current?.();
    cancelClose.current = delayed(
      SHEET_GRACE_MS,
      () => true,
      () => setOpen((o) => (isTouch() ? o : null)),
    );
  };
  // the sheet belongs to the table on screen: closed when the view moves on
  useEffect(() => {
    clearTimers();
    setOpen(null);
  }, [shown]);
  useEffect(() => clearTimers, []);
  if (!model.length) return null;
  return (
    <div className="player-bar">
      {model.map((a) => (
        <AvatarButton
          key={a.inv}
          a={a}
          legal={!!answerable(a.inv) || hasAbility(a.inv)}
          onTap={(el) => tap(a, el)}
          onEnter={(el, e) => enter(a, el, e)}
          onLeave={leave}
        />
      ))}
      {shown !== decider && decider && (
        <button className="pb-back" onClick={() => useView.getState().setViewing(null)}>
          {tr("players.back", { name: cardText(db, decider, gameStore.getState().locale).name })}
        </button>
      )}
      {open && (
        <Sheet
          inv={open.inv}
          anchor={open.anchor}
          onClose={() => setOpen(null)}
          onEnter={() => cancelClose.current?.()}
          onLeave={leave}
        />
      )}
    </div>
  );
}
