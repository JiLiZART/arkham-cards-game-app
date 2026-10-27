import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { campaignBlurb, scenarioText, t } from "../../content/i18n";
import { reducedMotion } from "../game/arrivals";
import { CardFace } from "../components/CardFace";
import { db, useGame } from "../state/context";
import { guideHtml, moreBelow } from "../game/guideText";
import { backUrl } from "../assets/images";
import { INTRO_STEPS, whenDealt } from "../game/intro";
import { useStage, useView } from "../state/view";
import { centreTransform, riseAndArc } from "./flights";

const FLY_MS = 650;

const boxOf = (el: Element) => {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
};

const slotOf = (id: string) =>
  document.querySelector(`[data-ui="scenario-panel"] [data-card="${id}"]`);

/**
 * The scenario introduction after the last mulligan, as the campaign guide reads it: first the story (the campaign's
 * prologue before its first scenario, then the scenario's intro), then the agenda and the act are drawn one at a time
 * out of their place in the act/agenda panel and held large in the middle; a click on the card (or Continue) puts it
 * back on the table. Then the locations are dealt (the map does that) and the introduction ends once they have landed.
 */
export function IntroOverlay() {
  const intro = useView((s) => s.intro);
  const game = useGame((s) => s.game)!;
  const campaign = useGame((s) => s.campaign);
  const locale = useGame((s) => s.locale);
  const card = useRef<HTMLButtonElement>(null);
  const flip = useRef<HTMLDivElement>(null);
  const [flying, setFlying] = useState(false);
  const text = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);
  const busy = useRef(false);
  const step = intro?.step;
  const holds = useStage(intro ? "intro" : null);

  const sc = scenarioText(db, game.scenarioId, locale);
  // the campaign guide opens with its prologue unless the campaign screen has already told a story
  const opening =
    campaign && !campaign.history.length && !campaign.flow.shown.some((s) => "story" in s)
      ? campaignBlurb(db, campaign.campaignId, locale).prologue
      : undefined;
  const story = [opening, sc.intro].filter(Boolean).join("\n\n");
  const id = step === "agenda" ? game.agenda : step === "act" ? game.act : null;
  const shown = holds && (step === "story" ? !!story : !!id);

  const next = () =>
    useView.setState((s) =>
      s.intro
        ? { intro: { ...s.intro, step: INTRO_STEPS[INTRO_STEPS.indexOf(s.intro.step) + 1] } }
        : {},
    );

  // nothing to read, or no agenda / act to draw: on to the next step
  useEffect(() => {
    if (holds && (step === "story" || step === "agenda" || step === "act") && !shown) next();
  }, [holds, step, shown]);

  // the draw: the card rises face down out of its place in the panel and turns face up on its way to the middle
  useLayoutEffect(() => {
    const el = card.current;
    if (!shown || !id || !el || reducedMotion()) return;
    const slot = slotOf(id);
    if (slot) riseAndArc(el, flip.current, boxOf(slot), 0);
  }, [shown, id]);

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

  const proceed = () => {
    if (busy.current) return;
    if (step === "story") return next();
    const el = card.current;
    const slot = id && slotOf(id);
    if (!el || !slot || reducedMotion()) return next();
    busy.current = true;
    setFlying(true);
    el.getAnimations().forEach((a) => a.finish());
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
    if (!shown) return;
    const key = (e: KeyboardEvent) => {
      if (e.key !== " " && e.key !== "Enter") return;
      e.preventDefault();
      proceed();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  if (!shown) return null;
  return (
    <div className={`intro-overlay ${flying ? "flying" : ""}`} key={step}>
      <div className="intro-box">
        {step === "story" ? (
          <>
            <h1 className="intro-title">{sc.name}</h1>
            <div
              className={`intro-text intro-story ${more ? "more" : ""}`}
              ref={text}
              tabIndex={0}
              dangerouslySetInnerHTML={{ __html: guideHtml(story) }}
            />
          </>
        ) : (
          <button
            className="intro-card"
            ref={card}
            data-intro={step}
            onClick={proceed}
            aria-label={t(db, locale, "intro.place")}
          >
            <div className="flip flipped" ref={flip}>
              <div className="flip-front">
                <CardFace code={game.cards[id!].code} locale={locale} />
              </div>
              <div className="flip-back">
                <img src={backUrl("encounter")} alt="" draggable={false} />
              </div>
            </div>
          </button>
        )}
        <div className="intro-buttons">
          <button className="primary big" onClick={proceed} autoFocus>
            {t(db, locale, step === "story" ? "intro.continue" : "intro.place")}
          </button>
          <button className="link" onClick={skip}>
            {t(db, locale, "intro.skip")}
          </button>
        </div>
      </div>
    </div>
  );
}
