import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { cardText, t } from "../../../content/i18n";
import type { GameState, InstId } from "../../../engine/types";
import { rememberRect } from "../../game/arrivals";
import { CardFace } from "../../components/CardFace";
import { db, useGame } from "../../state/context";
import { outsideSpotlight, useView } from "../../state/view";
import { openHandLayout, peekLayout } from "../fan";
import { GlanceBadge } from "../GlanceBadge";
import { useHand } from "../HandFan";
import { moment } from "../SoundLayer";
import { cx } from "../../components/cx";
import styles from "./HandDrawer.module.css";

/** a swipe down this far closes the open drawer */
const SWIPE_CLOSE = 40;

/**
 * The phone's hand (ADR-0005): collapsed, the top of each card peeks along the bottom edge (playable cards higher and
 * outlined); a tap or a swipe up opens the fan over the map at a readable size; a tap on a card that is an option
 * chooses it and the drawer closes (the mulligan keeps it open for the next pick); a tap outside or a swipe down closes it.
 */
export function HandDrawer() {
  const game = useGame((s) => s.game) as GameState;
  const locale = useGame((s) => s.locale);
  const choose = useGame((s) => s.choose);
  const spotlight = useView((s) => s.spotlight);
  const open = useView((s) => s.drawer === "hand");
  const setDrawer = useView((s) => s.setDrawer);
  const openMenu = useView((s) => s.openMenu);
  const { hand, faceUp, optionsFor } = useHand();
  const swipe = useRef<number | null>(null);
  // a hand held at another seat of the room is not drawn on the phone at all
  if (!hand.length || !faceUp) return null;
  const legal = hand.map((id) => optionsFor(id).length > 0);

  const pick = (id: InstId, el: HTMLElement) => {
    const opts = optionsFor(id);
    if (!opts.length) return;
    // a card played from here flies to the table from where it is now
    rememberRect(id, el);
    moment("button");
    const r = el.getBoundingClientRect();
    if (opts.length > 1) return openMenu(r.left + r.width / 2, r.top, opts);
    choose(opts[0].id);
    if (game.pending?.kind !== "mulligan") setDrawer(null);
  };
  const down = (e: ReactPointerEvent) => (swipe.current = e.clientY);
  const move = (e: ReactPointerEvent) => {
    if (swipe.current === null) return;
    const dy = e.clientY - swipe.current;
    if (!open && dy < -SWIPE_CLOSE / 2) {
      swipe.current = null;
      setDrawer("hand");
    } else if (open && dy > SWIPE_CLOSE) {
      swipe.current = null;
      setDrawer(null);
    }
  };
  const up = () => (swipe.current = null);

  if (!open) {
    const peek = peekLayout(hand.length, innerWidth, legal);
    return (
      <button
        className={styles.handDrawer}
        data-testid="hand-drawer"
        data-tip="hand"
        aria-label={t(db, locale, "phone.hand")}
        onClick={() => setDrawer("hand")}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
      >
        {hand.map((id, i) => (
          <span
            key={id}
            data-card={id}
            className={cx(
              styles.peekCard,
              legal[i] ? "legal" : "",
              outsideSpotlight(spotlight, id) ? "dimmed" : "",
            )}
            style={{
              left: peek[i].x,
              width: peek[i].w,
              height: peek[i].w * 1.4,
              bottom: peek[i].visible - peek[i].w * 1.4,
            }}
          >
            <CardFace code={game.cards[id].code} locale={locale} />
          </span>
        ))}
      </button>
    );
  }
  const o = openHandLayout(hand.length, innerWidth, innerHeight);
  return (
    <>
      <div className={cx("drawer-shade", styles.handShade)} onClick={() => setDrawer(null)} />
      <div
        className={cx(styles.handDrawer, "open")}
        data-testid="hand-drawer"
        data-tip="hand"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
      >
        {hand.map((id, i) => {
          const s = o.slots[i];
          return (
            <button
              key={id}
              data-card={id}
              className={cx(
                styles.handCard,
                legal[i] ? "legal" : "",
                outsideSpotlight(spotlight, id) ? "dimmed" : "",
              )}
              style={{
                left: s.x - o.w / 2,
                width: o.w,
                height: o.h,
                transform: `rotate(${s.rotate}deg)`,
                zIndex: i + 1,
              }}
              title={cardText(db, game.cards[id].code, locale).name}
              onClick={(e) => pick(id, e.currentTarget)}
            >
              <CardFace code={game.cards[id].code} locale={locale} />
              <GlanceBadge card={db.cards[game.cards[id].code]} />
            </button>
          );
        })}
      </div>
    </>
  );
}
