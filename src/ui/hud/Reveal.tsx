import { useEffect, useRef, useState } from "react";
import type { GameState } from "../../engine/types";
import { CardFace } from "../CardFace";
import { useGame } from "../context";
import { backUrl } from "../images";
import { viewerOf } from "../store";
import { useView } from "../view";
import { useFlyIn } from "./flights";

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** where an HTML element sits on screen, or the screen centre if it isn't rendered */
function rectOf(selector: string): Box {
  const r = document.querySelector(selector)?.getBoundingClientRect();
  return r ? { x: r.left, y: r.top, w: r.width, h: r.height } : { x: innerWidth / 2, y: innerHeight / 2, w: 0, h: 0 };
}

/** the card being resolved sits here, under the prompt banner */
export const RESOLVE_BOX = (): Box => ({ x: innerWidth / 2 - 130, y: 120, w: 260, h: 364 });

/** start at `from`, glide to `to` on the next frame (CSS transitions do the rest) */
function useFlight(from: () => Box, to: () => Box): Box {
  const [box, setBox] = useState(from);
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setBox(to())));
    return () => cancelAnimationFrame(id);
  }, []);
  return box;
}

/** an encounter card flies from the encounter pile to the middle and turns face up */
function EncounterFlight({ code, locale }: { code: string; locale: string }) {
  const box = useFlight(() => rectOf(".pile-column .pile:first-child .pile-card"), RESOLVE_BOX);
  const [flipped, setFlipped] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setFlipped(true), 380);
    return () => clearTimeout(id);
  }, []);
  return (
    <div className="flight" style={{ left: box.x, top: box.y, width: box.w, height: box.h }}>
      <div className={`flip ${flipped ? "flipped" : ""}`}>
        <div className="flip-back">
          <img src={backUrl("encounter")} alt="" draggable={false} />
        </div>
        <div className="flip-front">
          <CardFace code={code} locale={locale} />
        </div>
      </div>
    </div>
  );
}

/** cards in the "resolving" zone (a treachery, an event being played) shown over the middle of the screen */
function Resolving({ game, locale }: { game: GameState; locale: string }) {
  const cards = Object.values(game.cards).filter((c) => c.zone === "resolving");
  // an event played from hand flies here from the fan
  const ref = useRef<HTMLDivElement>(null);
  const setup = useGame((s) => s.setup);
  useFlyIn(ref, cards.length > 0, viewerOf(game), false, RESOLVE_BOX, setup);
  if (!cards.length) return null;
  const b = RESOLVE_BOX();
  return (
    <div className="resolving" ref={ref} data-card={cards.at(-1)!.id} style={{ left: b.x, top: b.y, width: b.w, height: b.h }}>
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
  if (current?.type === "encounter" && current.card && game.cards[current.card]) {
    if (!playing) return null;
    return <EncounterFlight key={key} code={game.cards[current.card].code} locale={locale} />;
  }
  // a card being resolved shows only while nothing else holds the middle (it may wait there for a choice)
  return stageFree ? <Resolving game={game} locale={locale} /> : null;
}
