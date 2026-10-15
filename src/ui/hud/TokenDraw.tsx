import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { reducedMotion } from "../arrivals";
import { centreTransform } from "./flights";
import { t } from "../../content/i18n";
import type { GameEvent, GameState } from "../../engine/types";
import { db, gameStore, useGame } from "../context";
import { Icon } from "../Icon";
import { iconUrl, isIcon } from "../icons";
import { breakdownRows, CIRCLE_R, circleLayout, type TestResultData } from "../tokenDraw";
import { ChaosTokenIcon } from "./ChaosTokenIcon";
import { CardFace } from "../CardFace";
import type { Part } from "../feed";
import { useView } from "../view";
import { Sentence } from "./Feed";

const tr = (key: string, vars?: Record<string, string | number>) => t(db, gameStore.getState().locale, key, vars);
const BAG = 220;
/** where revealed tokens land: beside the skill-test panel */
const LANDING = () => ({ x: innerWidth / 2 + 190, y: 104 });

/** tokens in the bag when this one was drawn: what's in it now, plus the ones out for this test, minus those drawn earlier in it */
function circlesFor(game: GameState, e: GameEvent): number {
  const testId = e.data?.testId;
  const out = game.skillTest && game.skillTest.id === testId ? game.skillTest.tokens.length : 0;
  const thisTest = game.log.filter((l) => l.type === "token" && l.data?.testId === testId);
  const earlier = Math.max(0, thisTest.findIndex((l) => l.text === e.text && l.data?.token === e.data?.token));
  return Math.max(1, game.chaosBag.length + out - earlier);
}

/** what the token is drawn for: the tested card (enemy, location, treachery…) and "investigator · skill value vs difficulty" */
export function TestSubject({ e }: { e: GameEvent }) {
  const game = useGame((s) => s.game) as GameState;
  const locale = useGame((s) => s.locale);
  const d = (e.data ?? {}) as { skill?: string; value?: number; difficulty?: number };
  const inst = e.card ? game.cards[e.card] : null;
  const back = !!inst && db.cards[inst.code].type === "location" && !inst.revealed;
  const parts: Part[] = [
    ...(e.inv && game.invs[e.inv] ? [{ t: "inv", id: e.inv } as Part, { t: "text", s: " · " } as Part] : []),
    ...(d.skill && isIcon(d.skill) ? [{ t: "icon", name: d.skill } as Part, { t: "text", s: ` ${tr(`stat.${d.skill}`)} ` } as Part] : []),
    ...(d.value !== undefined ? [{ t: "num", n: d.value } as Part, { t: "text", s: ` ${tr("draw.vs")} ` } as Part, { t: "num", n: d.difficulty ?? 0 } as Part] : []),
  ];
  return (
    <div className="test-subject">
      {inst && (
        <div
          className="test-subject-card"
          data-card={inst.id}
          onMouseEnter={(ev) => useView.getState().setHover(inst.id, ev.currentTarget.getBoundingClientRect())}
          onMouseLeave={() => useView.getState().setHover(null)}
        >
          <CardFace code={inst.code} locale={locale} side={back ? "back" : "front"} />
        </div>
      )}
      {parts.length > 0 && (
        <div className="test-subject-line">
          <Sentence parts={parts} size={26} />
        </div>
      )}
    </div>
  );
}

/**
 * The chaos token draw: the bag in the centre with a white circle per token; the player clicks one, the bag fades,
 * and the circle flies beside the skill-test panel turning into the revealed token. The token itself was already
 * drawn by the engine's seeded RNG, so the circle chosen never changes the result.
 */
export function TokenDraw({ e }: { e: GameEvent }) {
  const game = useGame((s) => s.game) as GameState;
  const next = useGame((s) => s.nextEvent);
  const n = useMemo(() => circlesFor(game, e), [e]);
  const circles = useMemo(() => circleLayout(n), [n]);
  const [picked, setPicked] = useState<number | null>(null);
  const [landed, setLanded] = useState(false);
  const token = String(e.data?.token);
  const bag = { x: innerWidth / 2, y: innerHeight / 2 + 60 };
  // the bag grows out of the chaos-bag button into the middle; the circles appear once it is there
  const bagRef = useRef<HTMLImageElement>(null);
  const [arrived, setArrived] = useState(false);
  const button = () => document.getElementById("chaos-bag")?.getBoundingClientRect();
  const boxOf = (r: DOMRect) => ({ x: r.left, y: r.top, w: r.width, h: r.height });
  useLayoutEffect(() => {
    const el = bagRef.current;
    const from = button();
    if (!el || !from?.width || reducedMotion()) return setArrived(true);
    const a = el.animate([{ transform: centreTransform(boxOf(el.getBoundingClientRect()), boxOf(from)), opacity: 0.6 }, { transform: "none", opacity: 1 }], { duration: 450, easing: "cubic-bezier(.2,.8,.2,1)" });
    let live = true;
    a.finished.catch(() => undefined).finally(() => live && setArrived(true));
    return () => {
      live = false;
      a.cancel();
    };
  }, []);

  const pick = (k: number) => {
    if (picked !== null || !arrived) return;
    setPicked(k);
    // the bag shrinks back into its button while the token flies out
    const el = bagRef.current;
    const to = button();
    if (el && to?.width && !reducedMotion())
      el.animate([{ transform: "none", opacity: 1 }, { transform: centreTransform(boxOf(el.getBoundingClientRect()), boxOf(to)), opacity: 0.4 }], { duration: 450, delay: 250, easing: "cubic-bezier(.5,0,.6,1)", fill: "forwards" });
    requestAnimationFrame(() => requestAnimationFrame(() => setLanded(true)));
    setTimeout(next, 1100);
  };
  useEffect(() => {
    const key = (ev: KeyboardEvent) => {
      if (ev.key === " " || ev.key === "Enter") {
        ev.preventDefault();
        pick(Math.floor(circles.length / 2));
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  const land = LANDING();
  return (
    <div className={`token-draw ${picked !== null ? "picked" : ""}`}>
      <div className="token-draw-hint">{picked === null ? tr("draw.hint") : ""}</div>
      <TestSubject e={e} />
      <img ref={bagRef} className="token-draw-bag" src={iconUrl("chaosBag")} alt="" draggable={false} style={{ left: bag.x - BAG / 2, top: bag.y - BAG * 0.42, width: BAG }} />
      {arrived && circles.map((c, k) => {
        const chosen = picked === k;
        const at = chosen && landed ? { left: land.x - 40, top: land.y - 40, size: 80 } : { left: bag.x + c.x - CIRCLE_R, top: bag.y - BAG * 0.42 + c.y - CIRCLE_R, size: CIRCLE_R * 2 };
        return (
          <button
            key={k}
            className={`token-circle ${chosen ? "chosen" : ""} ${chosen && landed ? "landed" : ""}`}
            style={{ left: at.left, top: at.top, width: at.size, height: at.size }}
            onClick={() => pick(k)}
            aria-label={tr("draw.circle")}
          >
            {chosen && landed && <ChaosTokenIcon token={token} size={80} />}
          </button>
        );
      })}
    </div>
  );
}

/** the calculation line by line; stays until Continue (or closes by itself when drawing by hand is off) */
export function TestBreakdown({ e }: { e: GameEvent }) {
  const next = useGame((s) => s.nextEvent);
  const byHand = useGame((s) => s.drawByHand);
  const d = e.data as unknown as TestResultData;
  const rows = breakdownRows(d);
  const sign = (v: number) => (v >= 0 ? `+${v}` : `−${Math.abs(v)}`);
  return (
    <div className="breakdown-wrap" onClick={(ev) => ev.stopPropagation()}>
      <div className={`breakdown ${d.success ? "ok" : "bad"}`}>
        {rows.map((r, k) => {
          switch (r.kind) {
            case "skill":
              return (
                <div key={k} className="bd-row">
                  {isIcon(r.skill) && <Icon name={r.skill} size={30} />} <span>{tr(`stat.${r.skill}`)}</span> <b>{r.value}</b>
                </div>
              );
            case "committed":
              return (
                <div key={k} className="bd-row">
                  <span>{tr("draw.committed")}</span> <b>{sign(r.value)}</b>
                </div>
              );
            case "tokens":
              return (
                <div key={k} className="bd-row">
                  {r.tokens.map((tok, j) => (
                    <ChaosTokenIcon key={j} token={tok} size={34} />
                  ))}
                  <span>{tr("draw.token")}</span> <b>{r.autoFail ? tr("draw.autoFail") : sign(r.value)}</b>
                </div>
              );
            case "total":
              return (
                <div key={k} className="bd-row total">
                  <b>= {r.value}</b> <span>vs</span> <b>{r.difficulty}</b>
                </div>
              );
            case "result":
              return (
                <div key={k} className="bd-result">
                  {r.success ? tr("draw.success") : tr("draw.fail")}
                </div>
              );
          }
        })}
        {byHand && (
          <button className="primary big" onClick={next} autoFocus>
            {tr("draw.continue")}
          </button>
        )}
      </div>
    </div>
  );
}
