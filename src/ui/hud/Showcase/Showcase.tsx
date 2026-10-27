import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { t } from "../../../content/i18n";
import type { GameState, InstId } from "../../../engine/types";
import { domPlace, noteLocalMove, reducedMotion } from "../../game/arrivals";
import { CardFace } from "../../components/CardFace";
import { db, useGame } from "../../state/context";
import { backUrl } from "../../assets/images";
import { viewerOf } from "../../state/store";
import { deckPick } from "../../game/optionHome";
import { useStage, useView } from "../../state/view";
import { riseAndArc, riseDelay } from "../flights";
import { showcaseLayout } from "../../game/showcaseLayout";
import { cardDetails } from "../../game/details";
import { DetailsColumn } from "../HandDetails";
import { RESOLVE_BOX } from "../Reveal";
import { moment } from "../SoundLayer";
import { cx } from "../../components/cx";
import styles from "./Showcase.module.css";

/**
 * The showcase in the middle of the screen: cards just drawn into the on-screen hand rise out of the deck and arc here, face up, and
 * wait until the player sends them to the hand (a click, "To hand", Space or Enter); choices wait meanwhile.
 * A choice that picks one of the viewer's deck or discard cards shows those cards here too, out of the same pile: a click picks one.
 */
export function Showcase() {
  const drawn = useView((s) => s.showcase);
  const game = useGame((s) => s.game) as GameState;
  const locale = useGame((s) => s.locale);
  const busy = useGame((s) => !!s.current || s.queue.length > 0);
  const intro = useView((s) => !!s.intro);
  const choose = useGame((s) => s.choose);
  const pick = drawn.length || intro ? [] : deckPick(game, viewerOf(game));
  const ids = drawn.length ? drawn : pick;
  // the middle of the screen is asked for once the events before these cards have played
  const holds = useStage(ids.length && !busy ? "showcase" : null);
  const root = useRef<HTMLDivElement>(null);
  // the cards' size follows the window
  const [screen, setScreen] = useState({ w: innerWidth, h: innerHeight });
  useEffect(() => {
    const on = () => setScreen({ w: innerWidth, h: innerHeight });
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  const flown = useRef(new Set<InstId>());
  // the details column beside a hovered, focused or long-pressed card (no enlarged copy: the card is already large)
  const [detail, setDetail] = useState<{ id: InstId; rect: DOMRect; left: boolean } | null>(null);
  const press = useRef<ReturnType<typeof setTimeout>>();
  // the drawn cards turn face up on their way in
  useEffect(() => {
    if (holds && drawn.length) moment("flip");
  }, [holds, drawn.length]);

  // new cards rise face down out of their pile (the deck; a pick from the discard comes from the discard) and arc to their place
  useLayoutEffect(() => {
    const els = [
      ...(root.current?.querySelectorAll<HTMLElement>('[data-testid="sc-card"][data-card]') ?? []),
    ];
    let k = 0;
    for (const el of els) {
      const id = el.dataset.card!;
      if (flown.current.has(id)) continue;
      flown.current.add(id);
      const pile = domPlace(
        !drawn.includes(id) && game.cards[id]?.zone === "discard" ? "discard" : "deck",
        RESOLVE_BOX,
      );
      if (!pile || reducedMotion()) continue;
      riseAndArc(
        el,
        el.querySelector<HTMLElement>('[data-testid="sc-flip"]'),
        pile,
        riseDelay(k++),
      );
    }
    for (const id of flown.current) if (!ids.includes(id)) flown.current.delete(id);
  });

  // the drawn cards (all, or the one clicked) go on to the fan, which flies each one from where it stands here
  const toHand = (only?: InstId) => {
    root.current
      ?.querySelectorAll<HTMLElement>('[data-testid="sc-card"][data-card]')
      .forEach((el) => (!only || el.dataset.card === only) && noteLocalMove(el.dataset.card!, el));
    setDetail(null);
    useView.setState((v) => ({ showcase: only ? v.showcase.filter((x) => x !== only) : [] }));
  };
  const choosePick = (id: InstId, el: HTMLElement) => {
    const o = game.pending?.options.find((x) => x.card === id);
    if (!o || busy) return;
    noteLocalMove(id, el);
    setDetail(null);
    choose(o.id);
  };

  useEffect(() => {
    if (!drawn.length || !holds) return;
    const key = (e: KeyboardEvent) => {
      if (e.key !== " " && e.key !== "Enter") return;
      e.preventDefault();
      toHand();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [drawn.length, holds]);

  if (!ids.length || !holds) return null;
  const layout = showcaseLayout(ids.length, screen.w, screen.h);
  // the rightmost column's details go to its left, so they don't run off the screen
  const show = (id: InstId, i: number, el: HTMLElement) =>
    setDetail({
      id,
      rect: el.getBoundingClientRect(),
      left: layout.cols > 1 && i % layout.cols === layout.cols - 1,
    });
  // under drawn cards: how to take them; under a pick: choose one, with the options that aren't cards as links in the line
  // a searched card that doesn't match is shown but can't be taken
  const pickable = (id: InstId) => !!game.pending?.options.some((o) => o.card === id);
  const others = pick.length ? (game.pending?.options ?? []).filter((o) => !o.card) : [];
  const none = others.find((o) => o.id === "none");
  const links = others.filter((o) => o !== none);
  const link = (o: (typeof others)[number], label: string) => (
    <button key={o.id} className="link" disabled={busy} onClick={() => choose(o.id)}>
      {label}
    </button>
  );
  const SPLIT = "\u0000";
  const [before, after] = t(db, locale, none ? "showcase.chooseOrNone" : "showcase.choose", {
    none: SPLIT,
  }).split(SPLIT);
  const help = drawn.length ? (
    t(db, locale, "showcase.take")
  ) : (
    <>
      {before}
      {none && link(none, t(db, locale, "rail.nothing").toLocaleLowerCase(locale))}
      {after}
      {links.map((o) => (
        <span key={o.id}>
          {" · "}
          {link(o, o.label)}
        </span>
      ))}
    </>
  );
  return (
    <div
      className={cx("showcase", pick.length ? styles.picking : "")}
      ref={root}
      onClick={(e) =>
        drawn.length > 0 && !(e.target as Element).closest('[data-testid="sc-help"]') && toHand()
      }
    >
      <div
        className="sc-cards"
        style={{ ["--cols" as string]: layout.cols, ["--w" as string]: `${layout.width}px` }}
      >
        {ids.map((id, i) => (
          <button
            key={id}
            data-testid="sc-card"
            className={cx("sc-card", pick.length && !pickable(id) ? styles.scOff : "")}
            data-card={id}
            disabled={!!pick.length && (busy || !pickable(id))}
            onClick={(e) => {
              if (pick.length) return choosePick(id, e.currentTarget);
              // a drawn card goes to the hand by itself; the others stay to be read
              e.stopPropagation();
              toHand(id);
            }}
            onMouseEnter={(e) => show(id, i, e.currentTarget)}
            onMouseLeave={() => setDetail(null)}
            onFocus={(e) => show(id, i, e.currentTarget)}
            onBlur={() => setDetail(null)}
            onPointerDown={(e) => {
              // a long press on a touch screen shows the details until the finger lifts
              if (e.pointerType !== "touch") return;
              const el = e.currentTarget;
              press.current = setTimeout(() => show(id, i, el), 350);
            }}
            onPointerUp={() => {
              clearTimeout(press.current);
              setDetail(null);
            }}
            onPointerCancel={() => clearTimeout(press.current)}
          >
            <span className="sc-flip" data-testid="sc-flip">
              <span className="sc-front">
                <CardFace code={game.cards[id].code} locale={locale} />
              </span>
              <img
                className="sc-back"
                src={backUrl(game.cards[id].zone === "encounterDeck" ? "encounter" : "player")}
                alt=""
                draggable={false}
              />
            </span>
          </button>
        ))}
      </div>
      <div className="sc-help" data-testid="sc-help">
        {help}
      </div>
      {detail && game.cards[detail.id] && (
        <DetailsColumn
          rows={cardDetails(db, game.cards[detail.id].code, locale)}
          rect={{
            x0: detail.rect.left,
            y0: detail.rect.top,
            x1: detail.rect.right,
            y1: detail.rect.bottom,
          }}
          prefer={detail.left ? "left" : "right"}
        />
      )}
    </div>
  );
}
