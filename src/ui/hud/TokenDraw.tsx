import { useEffect, useMemo, useState } from "react";
import { t } from "../../content/i18n";
import type { GameEvent, GameState } from "../../engine/types";
import { db, gameStore, useGame } from "../context";
import { Icon } from "../Icon";
import { iconUrl, isIcon } from "../icons";
import { breakdownRows, CIRCLE_R, circleLayout, type TestResultData } from "../tokenDraw";
import { ChaosTokenIcon } from "./ChaosTokenIcon";

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

  const pick = (k: number) => {
    if (picked !== null) return;
    setPicked(k);
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
      <img className="token-draw-bag" src={iconUrl("chaosBag")} alt="" draggable={false} style={{ left: bag.x - BAG / 2, top: bag.y - BAG * 0.42, width: BAG }} />
      {circles.map((c, k) => {
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
