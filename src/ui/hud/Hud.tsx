import { useEffect, useMemo, useRef } from "react";
import { cardText, scenarioText, t } from "../../content/i18n";
import { difficultyOf, testValue } from "../../engine/rules/skillTest";
import type { GameEvent } from "../../engine/types";
import { db, gameStore, useGame } from "../context";
import { ANIMATED, viewerOf } from "../store";
import { handVisible } from "../scene/Table";
import { glyphHtml } from "../glyphs";
import { iconSource, MARKUP_ICONS } from "../icons";
import { ActionRail, CameraButtons, PromptBanner } from "./ActionRail";
import { ChaosTokenIcon } from "./ChaosTokenIcon";
import { HoverCard } from "./HoverCard";
import { Modals } from "./Modals";
import { TestBreakdown, TokenDraw } from "./TokenDraw";
import { RevealOverlay } from "./Reveal";
import { CardFace } from "../CardFace";
import { ChaosBagButton, PileColumn, PlayStrip, ScenarioPanel } from "./Panels";
import { InvTokens } from "./Investigators";
import { StatBar } from "./Stats";
import { useView } from "../view";

const tr = (key: string, vars?: Record<string, string | number>) => t(db, gameStore.getState().locale, key, vars);
const gOf = () => ({ s: gameStore.getState().game!, db, events: [] });

/** how long each animated event holds the screen (ms) */
const DURATION: Record<string, number> = { token: 650, testResult: 1300, encounter: 1400, attack: 700, spawn: 500, agendaAdvance: 1500, actAdvance: 1500, resolution: 800, enemyDefeated: 600, defeated: 1200, damage: 750, enemyDamage: 650, clues: 450, doom: 450 };

/** plays queued events one by one; input is blocked meanwhile */
function EventPlayer() {
  const current = useGame((s) => s.current);
  const next = useGame((s) => s.nextEvent);
  const skip = useGame((s) => s.skipEvents);
  const byHand = useGame((s) => s.drawByHand);
  // drawing by hand: the token draw and the result panel wait for the player instead of a timer
  const waits = byHand && (current?.type === "token" || current?.type === "testResult");
  useEffect(() => {
    if (!current || waits) return;
    const id = setTimeout(next, current.type === "testResult" ? 1800 : (DURATION[current.type] ?? 500));
    return () => clearTimeout(id);
  }, [current, next, waits]);
  if (!current) return null;
  if (current.type === "token" && byHand) return <TokenDraw key={`${current.text}:${current.data?.testId}`} e={current} />;
  if (current.type === "testResult") return <TestBreakdown e={current} />;
  return (
    <div className="event-banner" onClick={skip} title="Click to skip">
      <EventText e={current} />
    </div>
  );
}

function EventText({ e }: { e: GameEvent }) {
  if (e.type === "token") return <div className="result">Chaos token: <ChaosTokenIcon token={String(e.data?.token)} size={40} /></div>;
  return <div className="result">{e.text}</div>;
}

function TopBar() {
  const game = useGame((s) => s.game)!;
  const locale = useGame((s) => s.locale);
  const toggle = useView((s) => s.toggle);
  return (
    <div className="topbar">
      <div className="scen">
        <b>{scenarioText(db, game.scenarioId, locale).name}</b> · {tr("hud.round", { round: game.round, phase: game.phase })}
      </div>
      <div className="buttons">
        <button onClick={() => toggle("log")}>{tr("hud.log")}</button>
        <button onClick={() => toggle("debug")}>{tr("hud.debug")}</button>
        <button onClick={() => gameStore.setState({ screen: "menu" })}>{tr("hud.menu")}</button>
      </div>
    </div>
  );
}

/** skill test in progress: value vs difficulty, committed cards */
function SkillTestPanel() {
  const game = useGame((s) => s.game)!;
  const locale = useGame((s) => s.locale);
  const st = game.skillTest;
  if (!st) return null;
  const g = gOf();
  const value = testValue(g, st);
  const diff = difficultyOf(g, st);
  return (
    <div className="skilltest">
      <div className="st-title">
        {cardText(db, st.inv, locale).name} · {st.skill} test · {st.sourceLabel}
      </div>
      <div className="st-calc">
        <span className="st-value">{value}</span> vs <span className="st-diff">{diff}</span>
        {st.tokens.length > 0 && (
          <span className="st-tokens">
            {st.tokens.map((tk, k) => (
              <ChaosTokenIcon key={k} token={tk} size={30} />
            ))}
          </span>
        )}
      </div>
      {st.committed.length > 0 && (
        <div className="st-committed">
          {st.committed.map((c) => (
            <span key={c} className="st-commit-card" title={cardText(db, game.cards[c].code, locale).name}>
              <CardFace code={game.cards[c].code} locale={locale} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** "pass the device" screen between players when hands are private */
function HandOff() {
  const game = useGame((s) => s.game)!;
  const privacy = useGame((s) => s.privacy);
  const revealedFor = useGame((s) => s.revealedFor);
  const confirm = useGame((s) => s.confirmHandoff);
  const busy = useGame((s) => !!s.current || s.queue.length > 0);
  const locale = useGame((s) => s.locale);
  const viewer = viewerOf(game);
  if (busy || !game.pending || handVisible(privacy, game.order.length, viewer, revealedFor)) return null;
  const name = cardText(db, viewer!, locale).name;
  return (
    <div className="handoff">
      <div className="handoff-box">
        <h2>{tr("hud.passTo", { name })}</h2>
        <button
          className="primary big"
          onClick={() => {
            useView.getState().setHovered(null);
            confirm();
          }}
        >
          {tr("hud.ready", { name })}
        </button>
      </div>
    </div>
  );
}

/** ArkhamDB markup → safe HTML (only tags we generate) */
export function formatText(s: string): string {
  const esc = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc
    .replace(/&lt;(\/?)(b|i)&gt;/g, "<$1$2>")
    .replace(/\[\[([^\]]+)\]\]/g, "<i>$1</i>")
    .replace(/\[(\w+)\]/g, (_, k: string) => {
      // inline icons come from the slim icon font, coloured like the printed ones where they have a colour
      const icon = MARKUP_ICONS[k];
      const src = icon ? iconSource(icon) : null;
      const color = src && "glyph" in src ? (src.under?.color ?? src.color) : undefined;
      return glyphHtml(k, k.replace("_", " "), color) ?? `<span class="icon icon-${k}" title="${k.replace("_", " ")}">${k.replace("_", " ")}</span>`;
    })
    .replace(/\n/g, "<br/>");
}

/** options for a card with several possible actions */
function PopupMenu() {
  const menu = useView((s) => s.menu);
  const close = useView((s) => s.closeMenu);
  const choose = useGame((s) => s.choose);
  if (!menu) return null;
  return (
    <div className="popup" style={{ left: menu.x, top: menu.y }}>
      {menu.options.map((o) => (
        <button
          key={o.id}
          onClick={() => {
            close();
            choose(o.id);
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function LogPanel() {
  const panel = useView((s) => s.panel);
  const log = useGame((s) => s.game?.log ?? []);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView(), [log.length, panel]);
  if (panel !== "log") return null;
  return (
    <div className="side-panel">
      <h3>{tr("hud.log")}</h3>
      {log.slice(-120).map((e, k) => (
        <div key={k} className={`log-${e.type} ${ANIMATED.has(e.type) ? "log-key" : ""}`}>{e.text}</div>
      ))}
      <div ref={end} />
    </div>
  );
}

function DebugPanel() {
  const panel = useView((s) => s.panel);
  const game = useGame((s) => s.game)!;
  const setup = useGame((s) => s.setup);
  const actions = useGame((s) => s.actions);
  const autoStep = useGame((s) => s.autoStep);
  const exportLog = useGame((s) => s.exportLog);
  const importLog = useGame((s) => s.importLog);
  const file = useRef<HTMLInputElement>(null);
  const json = useMemo(() => (panel === "debug" ? JSON.stringify({ ...game, log: `(${game.log.length} entries)` }, null, 1) : ""), [game, panel]);
  if (panel !== "debug") return null;
  const download = () => {
    const blob = new Blob([exportLog()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `arkham-${game.scenarioId}-${setup?.seed}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <div className="side-panel debug">
      <h3>{tr("hud.debug")}</h3>
      <div>
        seed {setup?.seed} · {actions.length} actions · round {game.round} · {game.phase}
      </div>
      <div className="row">
        <button onClick={() => autoStep(1)}>Bot: 1 step</button>
        <button onClick={() => autoStep(25)}>Bot: 25</button>
        <button onClick={() => autoStep(400)}>Bot: 400</button>
      </div>
      <div className="row">
        <button onClick={download}>Download action log</button>
        <button onClick={() => file.current?.click()}>Load action log…</button>
        <input
          ref={file}
          type="file"
          accept="application/json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              importLog(await f.text());
            } catch (err) {
              alert(`Could not replay this log: ${(err as Error).message}`);
            }
          }}
        />
      </div>
      <textarea readOnly value={json} />
    </div>
  );
}

function ScenarioEnd() {
  const game = useGame((s) => s.game)!;
  const finish = useGame((s) => s.finishScenario);
  const busy = useGame((s) => !!s.current || s.queue.length > 0);
  const locale = useGame((s) => s.locale);
  if (game.phase !== "ended" || busy) return null;
  const r = scenarioText(db, game.scenarioId, locale).resolution(game.resolution ?? "none");
  return (
    <div className="handoff">
      <div className="handoff-box resolution">
        <h2>{r?.title ?? game.resolution}</h2>
        <p>{r?.text}</p>
        <button className="primary big" onClick={finish}>{tr("log.title")} →</button>
      </div>
    </div>
  );
}

function ErrorToast() {
  const error = useGame((s) => s.error);
  if (!error) return null;
  return <div className="error" onClick={() => gameStore.setState({ error: null })}>{error}</div>;
}

export function Hud() {
  return (
    <>
      <TopBar />
      <ScenarioPanel />
      <PileColumn />
      <ChaosBagButton />
      <StatBar />
      <InvTokens />
      <PlayStrip />
      <div className="center-col">
        <PromptBanner />
        <SkillTestPanel />
      </div>
      <div className="right-dock">
        <CameraButtons />
        <ActionRail />
      </div>
      <HoverCard />
      <Modals />
      <PopupMenu />
      <LogPanel />
      <DebugPanel />
      <RevealOverlay />
      <EventPlayer />
      <HandOff />
      <ScenarioEnd />
      <ErrorToast />
    </>
  );
}
