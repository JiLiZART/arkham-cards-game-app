import { Fragment, useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import { useLayoutMode } from "../../state/layoutMode";
import { tapCard } from "../../game/touch";
import { t } from "../../../content/i18n";
import type { GameState, InstId } from "../../../engine/types";
import { rememberRect } from "../../game/arrivals";
import { useCardClick } from "../../game/cardClick";
import { db, gameStore, useGame } from "../../state/context";
import { heldCards } from "../../state/store";
import { useShown } from "../../state/usePlayers";
import { SlotChips } from "../GlanceBadge";
import { useView } from "../../state/view";
import { heldGame } from "../../game/spotlight";
import { useFlyIn } from "../flights";
import { RESOLVE_BOX } from "../Reveal";
import { moment } from "../SoundLayer";
import { stripDuringTest } from "../../game/testScreen";
import { MiniCard } from "../MiniCard";
import { cx } from "../../components/cx";
import styles from "./PlayStrip.module.css";

const tr = (key: string, vars?: Record<string, string | number>) =>
  t(db, gameStore.getState().locale, key, vars);
/** strip column card width: full size, smaller when the column is crowded, never below the minimum (then it scrolls) (px) */
const STRIP_W = 92;
const STRIP_MIN_W = 72;
const STRIP_GAP = 8;
const DIVIDER_H = 14;

/** the widest card that lets every slot fit in `room` px of column height: an upright card is 1.4 times its width tall, an exhausted one (lying sideways) its width */
export function columnCardWidth(
  room: number,
  upright: number,
  sideways: number,
  dividers: number,
): number {
  const units = upright * 1.4 + sideways;
  const gaps = (upright + sideways + dividers * 2 - 1) * STRIP_GAP + dividers * DIVIDER_H;
  return Math.max(STRIP_MIN_W, Math.min(STRIP_W, Math.floor((room - gaps) / Math.max(units, 1))));
}

/** the strip's order: the engaged enemies and threat-area cards first (Fight and Evade stay at the top), then a divider, then the assets */
export function stripOrder<T>(assets: T[], threats: T[]): { cards: T[]; dividerAt: number | null } {
  return {
    cards: [...threats, ...assets],
    dividerAt: assets.length && threats.length ? threats.length : null,
  };
}

/** the card whose buttons show: the hovered (peeked, focused) one, and only when it has options (one card at a time, so buttons never overlap) */
export function stripButtonsFor(
  hovered: InstId | null,
  byCard: Map<InstId, unknown[]>,
): InstId | null {
  return hovered && byCard.get(hovered)?.length ? hovered : null;
}

/** the space between the asset row's cards: the normal gap while they fit `w` px, then negative (they overlap) so the last one's edge stays at the row's; widths in px, an exhausted card lying sideways is 1.4 times its width */
export function rowGap(w: number, widths: number[]): number {
  if (widths.length < 2) return STRIP_GAP;
  const room = w - widths.reduce((a, b) => a + b, 0);
  return Math.min(STRIP_GAP, room / (widths.length - 1));
}

/**
 * The viewer's cards in play, then (after a separator) their threat area and engaged enemies, above the hand.
 * On the desktop they are two places: `threats` (the threat area and engaged enemies, a row at the top centre) and
 * `assets` (the cards in play, a row at the bottom left over the stat dock); the phone keeps them in one column.
 * A card's pending options pulse its ring and show as buttons in the centre of its enlarged copy (HoverCard); the test's target is outlined.
 */
export function PlayStrip({ part = "all" }: { part?: "all" | "threats" | "assets" }) {
  const game = useGame((s) => s.game) as GameState;
  const choose = useGame((s) => s.choose);
  const { byCard } = useCardClick();
  const viewer = useShown();
  const strip = useRef<HTMLDivElement>(null);
  const setup = useGame((s) => s.setup);
  const queue = useGame((s) => s.queue);
  const visible = !!viewer;
  // the phone (ADR-0005): a column of thumbnails on the right edge; a tap on its handle widens it to readable cards
  const phone = useLayoutMode() === "phone";
  const [open, setOpen] = useState(false);
  // new strip cards fly in from where they came from (before their rects are remembered below)
  useFlyIn(strip, visible, viewer, RESOLVE_BOX, setup);
  const current = useGame((s) => s.current);
  // an enemy whose move hasn't played yet isn't engaged on screen yet; a card still in (or waiting for) the showcase isn't here yet
  const waiting = heldCards({ current, queue });
  const all = Object.values(heldGame(game, queue).cards).filter((c) => !waiting.has(c.id));
  const assets =
    part === "threats" ? [] : all.filter((c) => c.zone === "play" && c.controller === viewer);
  const threats =
    part === "assets"
      ? []
      : [
          ...all.filter((c) => c.zone === "threat" && c.controller === viewer),
          ...all.filter((c) => c.zone === "enemy" && c.engagedWith === viewer),
        ];
  const order = stripOrder(assets, threats);
  const shown = order.cards;
  // during a skill test the strip is compact while one of its cards has an option (a fast ability), and out of the way otherwise
  const mode = stripDuringTest(
    useView((v) => v.testing),
    shown.map((c) => c.id),
    byCard,
  );
  // the asset row is sized from the piles and the stat dock: measure again when the window changes
  const [, remeasure] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (part !== "assets") return;
    addEventListener("resize", remeasure);
    return () => removeEventListener("resize", remeasure);
  }, [part]);
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
    if (part === "assets") {
      // under the piles, over the stat dock and as wide as it; the cards keep full size and overlap when they don't fit
      const dock = document.querySelector('[data-ui="stat-dock"]')?.getBoundingClientRect();
      if (dock) {
        el.style.bottom = `${innerHeight - dock.top + 8}px`;
        el.style.width = `${dock.width}px`;
        el.style.setProperty(
          "--gap",
          `${rowGap(
            dock.width,
            shown.map((c) => (c.exhausted ? STRIP_W * 1.4 : STRIP_W)),
          )}px`,
        );
      }
    }
    const w = phone
      ? open
        ? 104
        : 44
      : part !== "all"
        ? STRIP_W
        : columnCardWidth(
            el.clientHeight,
            shown.length - sideways,
            sideways,
            assets.length && threats.length ? 1 : 0,
          );
    el.style.setProperty("--sw", `${w}px`);
    // not while stepped aside: the rects would be the ones below the screen
    if (mode !== "aside")
      el.querySelectorAll<HTMLElement>("[data-card]").forEach((c) =>
        rememberRect(c.dataset.card!, c),
      );
  });
  if (!visible || !shown.length) return null;
  const target = game.skillTest?.target ?? null;
  const card = (id: InstId, exhausted: boolean) => {
    const opts = byCard.get(id) ?? [];
    return (
      // keyboard focus shows the copy and its buttons like a hover does
      <div
        key={id}
        className={cx(styles.stripSlot, exhausted ? styles.exhausted : "")}
        onFocus={(e) => useView.getState().setHover(id, e.target.getBoundingClientRect())}
        onBlur={() => useView.getState().hovered === id && useView.getState().setHover(null)}
      >
        <MiniCard
          id={id}
          w="var(--sw)"
          h="calc(var(--sw) * 1.4)"
          legal={opts.length > 0}
          exhausted={exhausted}
          target={id === target}
          // one option: the card itself chooses it; several: the buttons on it do
          onClick={(e) =>
            tapCard(
              id,
              () => opts.length === 1 && choose(opts[0].id),
              e.currentTarget.getBoundingClientRect(),
            )
          }
        />
        {!phone && (
          <span className={styles.stripSlots}>
            <SlotChips card={db.cards[game.cards[id].code]} className="slot-chip" />
          </span>
        )}
      </div>
    );
  };
  return (
    <div
      data-ui="play-strip"
      className={cx(
        "play-strip",
        part !== "all" && styles[part],
        phone && "column",
        phone && open && "open",
        mode,
      )}
      ref={strip}
    >
      {phone && (
        <button
          className={styles.stripHandle}
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={tr("phone.strip")}
          title={tr("phone.strip")}
        >
          {open ? "›" : "‹"} {shown.length}
        </button>
      )}
      {order.cards.map((c, k) => (
        <Fragment key={c.id}>
          {k === order.dividerAt && <div className={styles.stripDivider} />}
          {card(c.id, c.exhausted)}
        </Fragment>
      ))}
    </div>
  );
}
