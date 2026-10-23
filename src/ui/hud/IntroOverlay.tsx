import { useEffect, useRef, useState } from "react";
import { scenarioText, t } from "../../content/i18n";
import { reducedMotion } from "../arrivals";
import { CardFace } from "../CardFace";
import { db, useGame } from "../context";
import { guideHtml, moreBelow } from "../guideText";
import { whenDealt } from "../intro";
import { useStage, useView } from "../view";
import { centreTransform } from "./flights";

const FLY_MS = 650;

const boxOf = (el: Element) => {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
};

/**
 * The scenario introduction after the last mulligan: the agenda large in the middle with the scenario name and intro
 * text, then the act; Continue flies each to its place in the act/agenda panel. Then the locations are dealt (the map
 * does that) and the introduction ends once they have landed.
 */
export function IntroOverlay() {
  const intro = useView((s) => s.intro);
  const game = useGame((s) => s.game)!;
  const locale = useGame((s) => s.locale);
  const card = useRef<HTMLDivElement>(null);
  const [flying, setFlying] = useState(false);
  const text = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);
  const busy = useRef(false);
  const step = intro?.step;
  const holds = useStage(intro ? "intro" : null);

  // the deal: the introduction ends when the last location has landed and flipped
  useEffect(() => {
    if (step !== "deal") return;
    return whenDealt(() => useView.setState({ intro: null }));
  }, [step, intro]);

  // a fade at the bottom of the intro text while more of it is below (it scrolls inside the box)
  useEffect(() => {
    const el = text.current;
    if (!el) return setMore(false);
    const update = () => setMore(moreBelow(el));
    update();
    el.addEventListener("scroll", update);
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    ro?.observe(el);
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      ro?.disconnect();
      window.removeEventListener("resize", update);
    };
  });

  const id = step === "agenda" ? game.agenda : step === "act" ? game.act : null;
  const next = () =>
    useView.setState((s) =>
      s.intro ? { intro: { ...s.intro, step: s.intro.step === "agenda" ? "act" : "deal" } } : {},
    );
  const proceed = () => {
    const el = card.current;
    if (busy.current || !el || !id) return;
    const slot = document.querySelector(`.scenario-panel [data-card="${id}"]`);
    if (!slot || reducedMotion()) return next();
    busy.current = true;
    setFlying(true);
    const a = el.animate(
      [{ transform: "none" }, { transform: centreTransform(boxOf(el), boxOf(slot)) }],
      { duration: FLY_MS, easing: "cubic-bezier(.5,0,.3,1)", fill: "forwards" },
    );
    a.finished
      .catch(() => undefined)
      .finally(() => {
        busy.current = false;
        setFlying(false);
        next();
      });
  };
  const skip = () => useView.setState({ intro: null });

  useEffect(() => {
    if (!id || !holds) return;
    const key = (e: KeyboardEvent) => {
      if (e.key !== " " && e.key !== "Enter") return;
      e.preventDefault();
      proceed();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  if (!id || !holds) return null;
  const sc = scenarioText(db, game.scenarioId, locale);
  return (
    <div className={`intro-overlay ${flying ? "flying" : ""}`} key={step}>
      <div className="intro-box">
        {step === "agenda" && <h1 className="intro-title">{sc.name}</h1>}
        <div className="intro-body">
          <div className="intro-card" ref={card} data-intro={step}>
            <CardFace code={game.cards[id].code} locale={locale} />
          </div>
          {step === "agenda" && sc.intro && (
            <div
              className={`intro-text ${more ? "more" : ""}`}
              ref={text}
              tabIndex={0}
              dangerouslySetInnerHTML={{ __html: guideHtml(sc.intro) }}
            />
          )}
        </div>
        <div className="intro-buttons">
          <button className="primary big" onClick={proceed} autoFocus>
            {t(db, locale, "intro.continue")}
          </button>
          <button className="link" onClick={skip}>
            {t(db, locale, "intro.skip")}
          </button>
        </div>
      </div>
    </div>
  );
}
