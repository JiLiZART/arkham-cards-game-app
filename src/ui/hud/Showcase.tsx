import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { t } from "../../content/i18n";
import type { GameState, InstId } from "../../engine/types";
import { domPlace, noteLocalMove, reducedMotion } from "../arrivals";
import { CardFace } from "../CardFace";
import { db, useGame } from "../context";
import { backUrl } from "../images";
import { viewerOf } from "../store";
import { deckPick } from "../optionHome";
import { useStage, useView } from "../view";
import { riseAndArc, riseDelay } from "./flights";
import { showcaseLayout } from "./showcaseLayout";
import { RESOLVE_BOX } from "./Reveal";
import { moment } from "./SoundLayer";

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
  // the drawn cards turn face up on their way in
  useEffect(() => {
    if (holds && drawn.length) moment("flip");
  }, [holds, drawn.length]);

  // new cards rise face down out of their pile (the deck; a pick from the discard comes from the discard) and arc to their place
  useLayoutEffect(() => {
    const els = [...(root.current?.querySelectorAll<HTMLElement>(".sc-card[data-card]") ?? [])];
    let k = 0;
    for (const el of els) {
      const id = el.dataset.card!;
      if (flown.current.has(id)) continue;
      flown.current.add(id);
      const pile = domPlace(!drawn.includes(id) && game.cards[id]?.zone === "discard" ? "discard" : "deck", RESOLVE_BOX);
      if (!pile || reducedMotion()) continue;
      riseAndArc(el, el.querySelector<HTMLElement>(".sc-flip"), pile, riseDelay(k++));
    }
    for (const id of flown.current) if (!ids.includes(id)) flown.current.delete(id);
  });

  // the drawn cards go on to the fan, which flies each one from where it stands here
  const toHand = () => {
    moment("button");
    root.current?.querySelectorAll<HTMLElement>(".sc-card[data-card]").forEach((el) => noteLocalMove(el.dataset.card!, el));
    useView.getState().setHover(null);
    useView.setState({ showcase: [] });
  };
  const choosePick = (id: InstId, el: HTMLElement) => {
    const o = game.pending?.options.find((x) => x.card === id);
    if (!o || busy) return;
    noteLocalMove(id, el);
    useView.getState().setHover(null);
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
  const others = pick.length ? (game.pending?.options ?? []).filter((o) => !o.card) : [];
  return (
    <div className={`showcase ${pick.length ? "picking" : ""}`} ref={root} >
      <div className="sc-cards" style={{ ["--cols" as string]: layout.cols, ["--w" as string]: `${layout.width}px` }}>
        {ids.map((id) => (
          <button
            key={id}
            className="sc-card"
            data-card={id}
            disabled={!!pick.length && busy}
            onClick={(e) => (pick.length ? choosePick(id, e.currentTarget) : toHand())}
            onMouseEnter={(e) => useView.getState().setHover(id, e.currentTarget.getBoundingClientRect())}
            onMouseLeave={() => useView.getState().setHover(null)}
          >
            <span className="sc-flip">
              <span className="sc-front">
                <CardFace code={game.cards[id].code} locale={locale} />
              </span>
              <img className="sc-back" src={backUrl("player")} alt="" draggable={false} />
            </span>
          </button>
        ))}
      </div>
      <div className="sc-buttons">
        {drawn.length > 0 ? (
          <button className="primary big" onClick={toHand} autoFocus>
            {t(db, locale, "showcase.toHand")}
          </button>
        ) : (
          others.map((o) => (
            <button key={o.id} className="big" disabled={busy} onClick={() => choose(o.id)}>
              {o.id === "none" ? t(db, locale, "rail.nothing") : o.label}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
