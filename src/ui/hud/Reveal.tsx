import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { t } from "../../content/i18n";
import type { GameState, InstId, InvId } from "../../engine/types";
import { domPlace, reducedMotion, rememberRect } from "../game/arrivals";
import { cardDetails } from "../game/details";
import { CardFace } from "../components/CardFace";
import { db, useGame } from "../state/context";
import { backUrl } from "../assets/images";
import { HELD, viewerOf } from "../state/store";
import { useView } from "../state/view";
import { riseAndArc, useFlyIn } from "./flights";
import { DetailsColumn } from "./HandDetails";
import { showcaseLayout } from "./showcaseLayout";
import { moment } from "./SoundLayer";

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** the card being resolved sits here, under the prompt banner */
export const RESOLVE_BOX = (): Box => ({ x: innerWidth / 2 - 130, y: 120, w: 260, h: 364 });

/**
 * A drawn encounter card or weakness, in the showcase: it rises face down out of its pile, arcs to the middle turning
 * face up, and waits, large and readable, until the player taps it (or Continue, Space, Enter). Nothing it does happens
 * before that; then it leaves from where it stands for wherever the game puts it.
 */
function EncounterShowcase({
  id,
  code,
  inv,
  weakness,
  locale,
}: {
  id: InstId;
  code: string;
  inv: InvId | null;
  weakness: boolean;
  locale: string;
}) {
  const next = useGame((s) => s.nextEvent);
  const game = useGame((s) => s.game) as GameState;
  const card = useRef<HTMLButtonElement>(null);
  const [screen, setScreen] = useState({ w: innerWidth, h: innerHeight });
  const [detail, setDetail] = useState<DOMRect | null>(null);
  const press = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    const on = () => setScreen({ w: innerWidth, h: innerHeight });
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  // out of the encounter deck, or the drawer's deck (another investigator's comes from the pile column)
  useLayoutEffect(() => {
    const el = card.current;
    if (!el) return;
    moment("flip");
    const pile = domPlace(
      weakness ? (inv && inv === viewerOf(game) ? "deck" : "piles") : "encounter",
      RESOLVE_BOX,
    );
    if (pile && !reducedMotion())
      riseAndArc(el, el.querySelector<HTMLElement>('[data-ui="sc-flip"]'), pile, 0);
  }, []);
  const send = () => {
    if (card.current) rememberRect(id, card.current);
    setDetail(null);
    next();
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.key !== " " && e.key !== "Enter") || e.repeat) return;
      if ((e.target as HTMLElement | null)?.closest?.("input, textarea, select")) return;
      e.preventDefault();
      send();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  const { width } = showcaseLayout(1, screen.w, screen.h);
  return (
    <div
      className="showcase encounter-showcase"
      data-ui="encounter-showcase"
      onClick={(e) => !(e.target as Element).closest('[data-ui="sc-help"]') && send()}
    >
      <div
        className="sc-cards"
        style={{ ["--cols" as string]: 1, ["--w" as string]: `${width}px` }}
      >
        <button
          ref={card}
          className="sc-card"
          data-ui="sc-card"
          data-card={id}
          onClick={(e) => {
            e.stopPropagation();
            send();
          }}
          onMouseEnter={(e) => setDetail(e.currentTarget.getBoundingClientRect())}
          onMouseLeave={() => setDetail(null)}
          onFocus={(e) => setDetail(e.currentTarget.getBoundingClientRect())}
          onBlur={() => setDetail(null)}
          onPointerDown={(e) => {
            // a long press on a touch screen shows the details until the finger lifts
            if (e.pointerType !== "touch") return;
            const el = e.currentTarget;
            press.current = setTimeout(() => setDetail(el.getBoundingClientRect()), 350);
          }}
          onPointerUp={() => clearTimeout(press.current)}
          onPointerCancel={() => clearTimeout(press.current)}
        >
          <span className="sc-flip" data-ui="sc-flip">
            <span className="sc-front">
              <CardFace code={code} locale={locale} />
            </span>
            <img
              className="sc-back"
              src={backUrl(weakness ? "player" : "encounter")}
              alt=""
              draggable={false}
            />
          </span>
        </button>
      </div>
      <div className="sc-help" data-ui="sc-help">
        {t(db, locale, "encounter.take")}{" "}
        <button className="primary" onClick={send} autoFocus>
          {t(db, locale, "draw.continue")}
        </button>
      </div>
      {detail && (
        <DetailsColumn
          rows={cardDetails(db, code, locale)}
          rect={{ x0: detail.left, y0: detail.top, x1: detail.right, y1: detail.bottom }}
          prefer="right"
        />
      )}
    </div>
  );
}

/** cards in the "resolving" zone (a treachery, an event being played) shown over the middle of the screen */
function Resolving({ game, locale }: { game: GameState; locale: string }) {
  const cards = Object.values(game.cards).filter((c) => c.zone === "resolving");
  // an event played from hand flies here from the fan
  const ref = useRef<HTMLDivElement>(null);
  const setup = useGame((s) => s.setup);
  useFlyIn(ref, cards.length > 0, viewerOf(game), RESOLVE_BOX, setup);
  if (!cards.length) return null;
  const b = RESOLVE_BOX();
  return (
    <div
      className="resolving"
      data-ui="resolving"
      ref={ref}
      data-card={cards.at(-1)!.id}
      style={{ left: b.x, top: b.y, width: b.w, height: b.h }}
    >
      <CardFace code={cards.at(-1)!.code} locale={locale} />
    </div>
  );
}

/** encounter draws, resolving cards and token pops: HTML over the map, animated from their HUD positions */
export function RevealOverlay() {
  const current = useGame((s) => s.current);
  const game = useGame((s) => s.game) as GameState;
  const locale = useGame((s) => s.locale);
  // these play when the event player lets the event start (settled, holding the middle of the screen)
  const playing = useView((s) => s.playing) === current && !!current;
  const stageFree = useView((s) => s.stage.length === 0);
  const key = current ? `${current.type}:${game.log.length}:${current.card ?? ""}` : "";
  if (current && HELD.has(current.type) && current.card && game.cards[current.card]) {
    if (!playing) return null;
    return (
      <EncounterShowcase
        key={key}
        id={current.card}
        code={game.cards[current.card].code}
        inv={current.inv ?? null}
        weakness={current.type === "weakness"}
        locale={locale}
      />
    );
  }
  // a card being resolved shows only while nothing else holds the middle (it may wait there for a choice)
  return stageFree ? <Resolving game={game} locale={locale} /> : null;
}
