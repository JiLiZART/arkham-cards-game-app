import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { reducedMotion } from "../arrivals";
import { centreTransform } from "./flights";
import { t } from "../../content/i18n";
import type { GameEvent, GameState } from "../../engine/types";
import { db, gameStore, useGame } from "../context";
import { Icon } from "../Icon";
import { bagLanding, spillLayout, type Area } from "../testScreen";
import { ChaosToken } from "../ChaosToken";
import { useLayoutMode } from "../layoutMode";
import { bagFrames, shadowFrames, tokenFrames, tokenPath, tossTiming } from "../toss";

const tr = (key: string, vars?: Record<string, string | number>) => t(db, gameStore.getState().locale, key, vars);
/** the bag in the draw stage, and a disc (a token's size on screen); smaller on the phone's short screen (ADR-0005) */
const SIZES = { desktop: { BAG: 150, DISC: 56, HINT_H: 38 }, phone: { BAG: 84, DISC: 44, HINT_H: 26 } };
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
  const pace = useGame((s) => s.pace);
  const { BAG, DISC, HINT_H } = SIZES[useLayoutMode()];
  // by hand: a disc per token in the bag; automatic: one token flips straight out of the bag
  const n = useMemo(() => (byHand ? circlesFor(game, e) : 1), [e, byHand]);
  const token = String(e.data?.token);
  const stage = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState<Area | null>(null);
  // the subject card the bag lands on, in the stage's own coordinates (the stage reaches past the card on every side)
  const [subject, setSubject] = useState<Area | null>(null);
  useLayoutEffect(() => {
    const r = stage.current!.getBoundingClientRect();
    setArea({ x: 0, y: 0, w: r.width, h: r.height });
    const card = document.querySelector(".st-subject-card, .st-subject-portrait")?.getBoundingClientRect();
    setSubject(card ? { x: card.left - r.left, y: card.top - r.top, w: card.width, h: card.height } : null);
  }, []);
  // the same test spills the same way after a reload: seeded by the test and the token's place in it
  const seed = Number(e.data?.testId ?? 0) * 31 + game.log.filter((l) => l.type === "token" && l.data?.testId === e.data?.testId).findIndex((l) => l.text === e.text);
  const spill = useMemo(() => {
    if (!area) return null;
    // the bottom rows of the stage hold the hint
    return byHand ? spillLayout(n, seed, { ...area, y: 0, h: area.h - HINT_H }, DISC) : { size: DISC * 1.4, points: [{ x: area.w / 2, y: area.h * 0.38 }] };
  }, [area, n, seed, byHand]);
  const [picked, setPicked] = useState<number | null>(null);
  const [arrived, setArrived] = useState(false);
  const bag = useRef<HTMLSpanElement>(null);
  const bagAnim = useRef<Animation | null>(null);
  const discs = useRef<(HTMLButtonElement | null)[]>([]);
  const shadows = useRef<(HTMLSpanElement | null)[]>([]);
  const button = () => document.getElementById("chaos-bag")?.getBoundingClientRect();
  const boxOf = (r: DOMRect) => ({ x: r.left, y: r.top, w: r.width, h: r.height });
  // the bag is tossed from the chaos-bag button onto the table: an arc, a landing with a squash, a tip with its mouth to the spill
  useLayoutEffect(() => {
    const el = bag.current;
    const from = button();
    if (!area) return;
    if (!el || !from?.width || reducedMotion()) return;
    const a = el.animate(bagFrames(boxOf(from), boxOf(el.getBoundingClientRect())), { duration: tossTiming(pace, n).bagMs / 0.6, fill: "forwards" });
    bagAnim.current = a;
    return () => a.cancel();
  }, [!!area]);
  // the tokens tumble out of the bag's mouth in a stream, each on its own seeded path; the pick waits for the last to come to rest
  const land = area ? (subject ? bagLanding(subject) : { x: area.w / 2, y: area.h - BAG * 0.35 }) : null;
  const mouth = land ? { x: land.x + BAG * 0.17, y: land.y - BAG * 0.36 } : null;
  useLayoutEffect(() => {
    if (!spill || !area || !mouth) return;
    if (reducedMotion()) return setArrived(true);
    const timing = tossTiming(pace, spill.points.length);
    const anims: Animation[] = [];
    spill.points.forEach((p, k) => {
      const path = tokenPath({ mouth, rest: p, seed, k, size: spill.size, stage: area });
      const opts = { duration: timing.pathMs(path.duration), delay: timing.launchAt(k), fill: "backwards" as const };
      const disc = discs.current[k];
      const shadow = shadows.current[k];
      // a token is there from the moment it leaves the bag
      if (disc) anims.push(disc.animate(tokenFrames(path, p).map((f, i) => ({ ...f, opacity: i === 0 ? 0 : 1 })), opts));
      if (shadow) anims.push(shadow.animate(shadowFrames(path, p), opts));
    });
    let live = true;
    Promise.all(anims.map((a) => a.finished)).then(
      () => live && setArrived(true),
      () => undefined,
    );
    return () => {
      live = false;
      anims.forEach((a) => a.cancel());
    };
  }, [spill]);

  const pick = (k: number) => {
    if (picked !== null || !arrived || !spill) return;
    setPicked(k);
    const motion = !reducedMotion();
    // the bag shrinks back into its button while the disc flips, then the token slides into the calculation
    bagAnim.current?.cancel();
    const el = bag.current;
    const to = button();
    if (motion && el && to?.width) el.animate([{ transform: "rotate(25deg)", opacity: 1 }, { transform: centreTransform(boxOf(el.getBoundingClientRect()), boxOf(to)), opacity: 0.4 }], { duration: 450, delay: 250, easing: "cubic-bezier(.5,0,.6,1)", fill: "forwards" });
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
    const id = setTimeout(() => pick(0), reducedMotion() ? 0 : 200);
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
          {/* the wrapper stays where the bag ends up (the tip points at it); the bag inside grows out of its button */}
          <span className="st-bag" data-tip="drawbag" style={{ left: land!.x - BAG / 2, top: land!.y - BAG / 2, width: BAG, height: BAG }}>
            <span ref={bag} className="st-bag-icon">
              <Icon name="chaosBag" size={BAG} />
            </span>
          </span>
          {spill?.points.map((p, k) => (
            <span key={`s${k}`} className="disc-shadow" ref={(el) => void (shadows.current[k] = el)} style={{ left: p.x - spill.size / 2, top: p.y - spill.size / 2, width: spill.size, height: spill.size }} />
          ))}
          {spill?.points.map((p, k) => (
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
                  {/* the token's cardboard edge, a few px behind its face: it shows when the token tilts */}
                  <span className="disc-edge" />
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
