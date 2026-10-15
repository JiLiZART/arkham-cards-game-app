import { useEffect, useState } from "react";
import type { GameState } from "../../engine/types";
import { CardFace } from "../CardFace";
import { useGame } from "../context";
import { backUrl } from "../images";
import { ChaosTokenIcon } from "./ChaosTokenIcon";

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

/** automatic token reveal: the token pops out of the bag toward the skill-test panel */
function TokenPop({ token }: { token: string }) {
  const box = useFlight(
    () => {
      const b = rectOf("#chaos-bag");
      return { x: b.x + b.w / 2 - 40, y: b.y + b.h / 2 - 40, w: 80, h: 80 };
    },
    () => ({ x: innerWidth / 2 + 170, y: 64, w: 80, h: 80 }),
  );
  return (
    <div className="flight token-flight" style={{ left: box.x, top: box.y, width: box.w, height: box.h }}>
      <ChaosTokenIcon token={token} size={80} />
    </div>
  );
}

/** cards in the "resolving" zone (a treachery, an event being played) shown over the middle of the screen */
function Resolving({ game, locale }: { game: GameState; locale: string }) {
  const cards = Object.values(game.cards).filter((c) => c.zone === "resolving");
  if (!cards.length) return null;
  const b = RESOLVE_BOX();
  return (
    <div className="resolving" style={{ left: b.x, top: b.y, width: b.w, height: b.h }}>
      <CardFace code={cards.at(-1)!.code} locale={locale} />
    </div>
  );
}

/** encounter draws, resolving cards and token pops: HTML over the map, animated from their HUD positions */
export function RevealOverlay() {
  const current = useGame((s) => s.current);
  const game = useGame((s) => s.game) as GameState;
  const locale = useGame((s) => s.locale);
  const drawByHand = useGame((s) => s.drawByHand);
  const key = current ? `${current.type}:${game.log.length}:${current.card ?? ""}` : "";
  if (current?.type === "encounter" && current.card && game.cards[current.card]) {
    return <EncounterFlight key={key} code={game.cards[current.card].code} locale={locale} />;
  }
  // the hand draw (TokenDraw) shows its own reveal
  if (current?.type === "token" && !drawByHand) return <TokenPop key={key} token={String(current.data?.token)} />;
  return <Resolving game={game} locale={locale} />;
}
