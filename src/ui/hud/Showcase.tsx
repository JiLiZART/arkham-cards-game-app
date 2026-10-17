import { useEffect, useLayoutEffect, useRef } from "react";
import { t } from "../../content/i18n";
import type { GameState, InstId } from "../../engine/types";
import { domPlace, noteLocalMove, reducedMotion, type ScreenBox } from "../arrivals";
import { CardFace } from "../CardFace";
import { db, useGame } from "../context";
import { backUrl } from "../images";
import { viewerOf } from "../store";
import { deckPick } from "../optionHome";
import { useStage, useView } from "../view";
import { centreTransform } from "./flights";
import { RESOLVE_BOX } from "./Reveal";
import { moment } from "./SoundLayer";

const boxOf = (el: Element): ScreenBox => {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
};

/**
 * The showcase in the middle of the screen: cards just drawn into the on-screen hand fly here from the deck face up and
 * wait until the player sends them to the hand (a click, "To hand", Space or Enter); choices wait meanwhile.
 * A choice that picks one of the viewer's deck or discard cards shows those cards here too: a click picks one.
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
  const flown = useRef(new Set<InstId>());
  // the drawn cards turn face up on their way in
  useEffect(() => {
    if (holds && drawn.length) moment("flip");
  }, [holds, drawn.length]);

  // drawn cards fly in from the deck pile, turning face up on the way; picks from a deck just appear
  useLayoutEffect(() => {
    const els = [...(root.current?.querySelectorAll<HTMLElement>(".sc-card[data-card]") ?? [])];
    const deck = domPlace("deck", RESOLVE_BOX);
    let k = 0;
    for (const el of els) {
      const id = el.dataset.card!;
      if (flown.current.has(id)) continue;
      flown.current.add(id);
      if (!drawn.includes(id) || !deck || reducedMotion()) continue;
      const timing = { duration: 600, delay: k++ * 150, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" as const };
      el.animate([{ transform: centreTransform(boxOf(el), deck) }, { transform: "none" }], timing);
      el.querySelector(".sc-flip")?.animate([{ transform: "rotateY(180deg)" }, { transform: "rotateY(0deg)" }], { ...timing, easing: "ease-in-out" });
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
  const others = pick.length ? (game.pending?.options ?? []).filter((o) => !o.card) : [];
  return (
    <div className={`showcase ${pick.length ? "picking" : ""}`} ref={root} style={{ ["--n" as string]: Math.min(ids.length, 6) }}>
      <div className="sc-cards">
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
