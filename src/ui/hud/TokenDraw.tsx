import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { reducedMotion } from "../arrivals";
import { centreTransform } from "./flights";
import { t } from "../../content/i18n";
import type { GameEvent, GameState } from "../../engine/types";
import { db, gameStore, useGame } from "../context";
import { Icon } from "../Icon";
import { spillLayout, type Area } from "../testScreen";
import { ChaosToken } from "../ChaosToken";

const tr = (key: string, vars?: Record<string, string | number>) => t(db, gameStore.getState().locale, key, vars);
/** the bag in the draw stage, and a disc (a token's size on screen) */
const BAG = 150;
const DISC = 56;
const HINT_H = 38;
const FLIP_MS = 550;
const SLIDE_MS = 450;

/** tokens in the bag when this one was drawn: what's in it now, plus the ones out for this test, minus those drawn earlier in it */
function circlesFor(game: GameState, e: GameEvent): number {
  const testId = e.data?.testId;
  const out = game.skillTest && game.skillTest.id === testId ? game.skillTest.tokens.length : 0;
  const thisTest = game.log.filter((l) => l.type === "token" && l.data?.testId === testId);
  const earlier = Math.max(0, thisTest.findIndex((l) => l.text === e.text && l.data?.token === e.data?.token));
  return Math.max(1, game.chaosBag.length + out - earlier);
}

/**
 * The draw stage of the skill-test screen: the bag grows out of its button into the middle, the discs spill out of it
 * (face down, a token's size), the player taps one, it flips in place to the real token and slides into the strip.
 * The token was already drawn by the engine's seeded RNG, so the disc chosen never changes the result.
 */
export function DrawStage({ e, byHand }: { e: GameEvent; byHand: boolean }) {
  const game = useGame((s) => s.game) as GameState;
  const next = useGame((s) => s.nextEvent);
  // by hand: a disc per token in the bag; automatic: one token flips straight out of the bag
  const n = useMemo(() => (byHand ? circlesFor(game, e) : 1), [e, byHand]);
  const token = String(e.data?.token);
  const stage = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState<Area | null>(null);
  useLayoutEffect(() => {
    const r = stage.current!.getBoundingClientRect();
    setArea({ x: 0, y: 0, w: r.width, h: r.height });
  }, []);
  // the same test spills the same way after a reload: seeded by the test and the token's place in it
  const seed = Number(e.data?.testId ?? 0) * 31 + game.log.filter((l) => l.type === "token" && l.data?.testId === e.data?.testId).findIndex((l) => l.text === e.text);
  const spill = useMemo(() => {
    if (!area) return null;
    // the top rows of the stage hold the hint
    return byHand ? spillLayout(n, seed, { ...area, y: HINT_H, h: area.h - HINT_H }, DISC) : { size: DISC * 1.4, points: [{ x: area.w / 2, y: area.h * 0.38 }] };
  }, [area, n, seed, byHand]);
  const [picked, setPicked] = useState<number | null>(null);
  const [arrived, setArrived] = useState(false);
  const bag = useRef<HTMLSpanElement>(null);
  const discs = useRef<(HTMLButtonElement | null)[]>([]);
  const button = () => document.getElementById("chaos-bag")?.getBoundingClientRect();
  const boxOf = (r: DOMRect) => ({ x: r.left, y: r.top, w: r.width, h: r.height });
  // the bag grows out of the chaos-bag button into the middle; the discs spill once it is there
  useLayoutEffect(() => {
    const el = bag.current;
    const from = button();
    if (!el || !from?.width || reducedMotion() || !area) return setArrived(!!area);
    const a = el.animate([{ transform: centreTransform(boxOf(el.getBoundingClientRect()), boxOf(from)), opacity: 0.6 }, { transform: "none", opacity: 1 }], { duration: 450, easing: "cubic-bezier(.2,.8,.2,1)" });
    let live = true;
    a.finished.catch(() => undefined).finally(() => live && setArrived(true));
    return () => {
      live = false;
      a.cancel();
    };
  }, [!!area]);
  // each disc tumbles out of the bag's mouth to its place, in a quick cascade
  useLayoutEffect(() => {
    if (!arrived || !spill || reducedMotion()) return;
    const mouth = { x: area!.w / 2, y: area!.h - BAG * 0.55 };
    spill.points.forEach((p, k) => {
      discs.current[k]?.animate([{ transform: `translate(${mouth.x - p.x}px, ${mouth.y - p.y}px) scale(0.3)`, opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 420, delay: k * 18, easing: "cubic-bezier(.2,.8,.3,1)", fill: "backwards" });
    });
  }, [arrived, spill]);

  const pick = (k: number) => {
    if (picked !== null || !arrived || !spill) return;
    setPicked(k);
    const motion = !reducedMotion();
    // the bag shrinks back into its button while the disc flips, then the token slides into the calculation
    const el = bag.current;
    const to = button();
    if (motion && el && to?.width) el.animate([{ transform: "none", opacity: 1 }, { transform: centreTransform(boxOf(el.getBoundingClientRect()), boxOf(to)), opacity: 0.4 }], { duration: 450, delay: 250, easing: "cubic-bezier(.5,0,.6,1)", fill: "forwards" });
    const disc = discs.current[k];
    if (motion && disc) {
      setTimeout(() => {
        const target = document.querySelector(".st-strip .st-eq")?.getBoundingClientRect();
        if (!target) return;
        const own = disc.getBoundingClientRect();
        disc.animate([{ transform: "none" }, { transform: centreTransform(boxOf(own), { x: target.left - 20, y: target.top + target.height / 2 - 17, w: 34, h: 34 }) }], { duration: SLIDE_MS, easing: "cubic-bezier(.5,0,.3,1)", fill: "forwards" });
      }, FLIP_MS);
    }
    setTimeout(next, motion ? FLIP_MS + SLIDE_MS + 50 : 600);
  };
  // automatic reveal: nobody taps, the one disc is "picked" once it has come out of the bag
  useEffect(() => {
    if (byHand || !arrived) return;
    const id = setTimeout(() => pick(0), reducedMotion() ? 0 : 560);
    return () => clearTimeout(id);
  }, [byHand, arrived]);
  useEffect(() => {
    if (!byHand) return;
    const key = (ev: KeyboardEvent) => {
      if (ev.key === " " || ev.key === "Enter") {
        ev.preventDefault();
        pick(Math.floor(n / 2));
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  return (
    <div className={`st-draw ${picked !== null ? "picked" : ""}`} ref={stage}>
      {area && (
        <>
          <div className="st-hint">{picked === null && byHand ? tr("draw.hint") : ""}</div>
          <span ref={bag} className="st-bag" data-tip="bag" style={{ left: area.w / 2 - BAG / 2, top: area.h - BAG * 0.85, width: BAG }}>
            <Icon name="chaosBag" size={BAG} />
          </span>
          {arrived &&
            spill?.points.map((p, k) => (
              <button
                key={k}
                ref={(el) => {
                  discs.current[k] = el;
                }}
                className={`token-circle ${picked === k ? "chosen" : ""} ${byHand ? "" : "auto"}`}
                style={{ left: p.x - spill.size / 2, top: p.y - spill.size / 2, width: spill.size, height: spill.size }}
                onClick={() => pick(k)}
                aria-label={tr("draw.circle")}
              >
                <span className="disc-flip">
                  <span className="disc-face disc-back" />
                  {picked === k && (
                    <span className="disc-face disc-front">
                      <ChaosToken token={token} size={spill.size} />
                    </span>
                  )}
                </span>
              </button>
            ))}
        </>
      )}
    </div>
  );
}
