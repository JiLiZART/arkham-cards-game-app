import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { scenarioText, t } from "../../../content/i18n";
import { reducedMotion } from "../../game/arrivals";
import { CardFace } from "../../components/CardFace";
import { db, useGame } from "../../state/context";
import { backUrl } from "../../assets/images";
import { INTRO_STEPS, whenDealt } from "../../game/intro";
import { useStage, useView } from "../../state/view";
import { centreTransform, riseAndArc } from "../flights";
import { cx } from "../../components/cx";
import styles from "./IntroOverlay.module.css";
import { cardOf } from "../../../engine/context";

const FLY_MS = 650;

const boxOf = (el: Element) => {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
};

const slotOf = (id: string) =>
  document.querySelector(`[data-testid="scenario-panel"] [data-card="${id}"]`);

/**
 * The scenario introduction after the last mulligan: the agenda and the act are drawn one at a time out of their place in
 * the act/agenda panel and held large in the middle, the scenario's name above the agenda; a click on the card (or
 * Continue) puts it back on the table. Then the locations are dealt (the map does that) and the introduction ends once
 * they have landed. The guide's story is read before, in the story reader.
 */
export function IntroOverlay() {
  const intro = useView((s) => s.intro);
  const game = useGame((s) => s.game)!;
  const locale = useGame((s) => s.locale);
  const card = useRef<HTMLButtonElement>(null);
  const flip = useRef<HTMLDivElement>(null);
  const [flying, setFlying] = useState(false);
  const busy = useRef(false);
  const step = intro?.step;
  const holds = useStage(intro ? "intro" : null);

  const sc = scenarioText(db, game.scenarioId, locale);
  const id = step === "agenda" ? game.agendas.a : step === "act" ? game.acts.a : null;
  const shown = holds && !!id;

  const next = () =>
    useView.setState((s) =>
      s.intro
        ? { intro: { ...s.intro, step: INTRO_STEPS[INTRO_STEPS.indexOf(s.intro.step) + 1] } }
        : {},
    );

  // nothing to read, or no agenda / act to draw: on to the next step
  useEffect(() => {
    if (holds && (step === "agenda" || step === "act") && !shown) next();
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

  const proceed = () => {
    if (busy.current) return;
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
    <div className={cx(styles.introOverlay, flying ? styles.flying : "")} key={step}>
      <div className={styles.introBox}>
        {step === "agenda" && <h1 className={styles.introTitle}>{sc.name}</h1>}
        <button
          className={styles.introCard}
          ref={card}
          data-intro={step}
          onClick={proceed}
          aria-label={t(db, locale, "intro.place")}
        >
          <div className={cx("flip", styles.flipped)} ref={flip}>
            <div className={styles.flipFront}>
              <CardFace code={cardOf(game, id!).code} locale={locale} />
            </div>
            <div className={styles.flipBack}>
              <img src={backUrl("encounter")} alt="" draggable={false} />
            </div>
          </div>
        </button>
        <div className={styles.introButtons}>
          <button className="primary big" onClick={proceed} autoFocus>
            {t(db, locale, "intro.place")}
          </button>
          <button className="link" onClick={skip}>
            {t(db, locale, "intro.skip")}
          </button>
        </div>
      </div>
    </div>
  );
}
