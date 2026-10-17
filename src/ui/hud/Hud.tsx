import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cardText, scenarioText, t } from "../../content/i18n";
import { testParts } from "../../engine/rules/skillTest";
import type { GameEvent } from "../../engine/types";
import { rememberRect, whenSettled } from "../arrivals";
import { useOptionsByCard } from "../cardClick";
import { Icon } from "../Icon";
import { db, gameStore, useGame } from "../context";
import { holdsForTap, viewerOf } from "../store";
import { handVisible } from "../scene/Table";
import { glyphHtml } from "../glyphs";
import { iconSource, isIcon, MARKUP_ICONS } from "../icons";
import { ActionRail, CameraButtons, InstructionBar, UndoButton } from "./ActionRail";
import { moment, SoundLayer } from "./SoundLayer";
import { TipLayer } from "./TipLayer";
import { ChaosTokenIcon } from "./ChaosTokenIcon";
import { HoverCard } from "./HoverCard";
import { Feed } from "./Feed";
import { ActionFloats, HitFx, HIT_MS } from "./Floats";
import { Modals } from "./Modals";
import { TestBreakdown, TokenDraw } from "./TokenDraw";
import { RevealOverlay } from "./Reveal";
import { ChaosBagButton, MiniCard, PileColumn, PlayStrip, ScenarioPanel } from "./Panels";
import { InvTokens } from "./Investigators";
import { MulliganRow } from "./MulliganRow";
import { IntroOverlay } from "./IntroOverlay";
import { Showcase } from "./Showcase";
import { StatBar } from "./Stats";
import { StepCaption } from "./StepCaption";
import { Ribbon } from "./Ribbon";
import { Portrait } from "../Portrait";
import { spotlightNow } from "../spotlight";
import { useStage, useView } from "../view";

const tr = (key: string, vars?: Record<string, string | number>) => t(db, gameStore.getState().locale, key, vars);
const gOf = () => ({ s: gameStore.getState().game!, db, events: [] });

/** how long each animated event holds the screen (ms) */
const DURATION: Record<string, number> = { enemyMove: 800, token: 650, testResult: 1300, encounter: 1400, attack: 700, spawn: 500, agendaAdvance: 1500, actAdvance: 1500, resolution: 800, enemyDefeated: 600, defeated: 1200, damage: 750, enemyDamage: 650, clues: 450, doom: 450 };

/** the Slow pace holds every event this many times as long */
const SLOW = 1.6;

/** events that start only once every card on screen has landed: the chaos draw, and a hit from a card */
export const waitsForSettle = (e: GameEvent | null) => e?.type === "token" || (e?.type === "damage" && !!e.data?.source);

/** events that take the middle of the screen (the rest play only while nothing holds it) */
const CENTER = new Set(["token", "testResult", "encounter"]);

/** plays queued events one by one; input is blocked meanwhile */
function EventPlayer() {
  const current = useGame((s) => s.current);
  const next = useGame((s) => s.nextEvent);
  const byHand = useGame((s) => s.drawByHand);
  const pace = useGame((s) => s.pace);
  // a chaos token draw waits until every card on screen has landed
  const settledFor = useView((s) => s.settledFor);
  // so does a hit from a card (its streak and numbers follow a revealed location's flip)
  const center = !!current && CENTER.has(current.type);
  const holds = useStage(center ? `event:${current!.logIndex}` : null);
  const stageFree = useView((s) => s.stage.length === 0);
  const ready = !!current && (!waitsForSettle(current) || settledFor === current) && (center ? holds : stageFree);
  // the event plays: everything else on the map dims around what it is about; once all is played, around the choice's options
  const game = useGame((s) => s.game);
  const queued = useGame((s) => s.queue.length > 0);
  const idle = !current && !queued && stageFree;
  useEffect(() => {
    const playing = ready ? current : null;
    useView.setState({ playing, spotlight: game ? spotlightNow(game, viewerOf(game), playing, idle) : null });
  }, [current, ready, game, idle]);
  useEffect(() => {
    if (!waitsForSettle(current)) return;
    return whenSettled(() => useView.setState({ settledFor: current }));
  }, [current]);
  // drawing by hand: the token draw and the result panel wait for the player instead of a timer
  // and at the Tap pace every big event waits for Next
  const waits = (byHand && (current?.type === "token" || current?.type === "testResult")) || holdsForTap(current, pace);
  useEffect(() => {
    if (!current || waits || !ready) return;
    // a hit from a card plays its streak first, then the numbers
    const hit = current.type === "damage" && current.data?.source ? HIT_MS + 300 : 0;
    const slow = pace === "slow" ? SLOW : 1;
    const id = setTimeout(next, (current.type === "testResult" ? 1800 : (DURATION[current.type] ?? 500) + hit) * slow);
    return () => clearTimeout(id);
  }, [current, next, waits, ready, pace]);
  if (!current || !ready) return null;
  if (current.type === "token" && byHand) return <TokenDraw key={`${current.text}:${current.data?.testId}`} e={current} />;
  if (current.type === "testResult") return <TestBreakdown e={current} />;
  // other events are told by the action floats and the feed
  return null;
}

/** phases that get a title */
const TITLED = new Set(["mythos", "investigation", "enemy", "upkeep"]);

/**
 * A new phase shows like a film's chapter title: the phase name in large type across the middle, the round under it.
 * Titles play one after another, wait for the chaos draw, test results and encounter reveals, and never take the pointer.
 * In a paced game the title is the lead investigator's pause before the phase: it stays, with Continue, until chosen.
 */
function PhaseTitle() {
  const game = useGame((s) => s.game)!;
  const setup = useGame((s) => s.setup);
  const current = useGame((s) => s.current);
  const seen = useRef<{ setup: unknown; n: number }>({ setup, n: game.log.length });
  const queue = useRef<{ phase: string; round: number; key: number }[]>([]);
  const [showing, setShowing] = useState<{ phase: string; round: number; key: number } | null>(null);
  // a new game (new or loaded) starts from its current log: nothing plays for phases already past; an undo shortens it
  if (seen.current.setup !== setup || game.log.length < seen.current.n) seen.current = { setup, n: game.log.length };
  if (game.log.length > seen.current.n) {
    for (let i = seen.current.n; i < game.log.length; i++) {
      const e = game.log[i];
      const phase = String(e.data?.phase ?? "");
      // a paced game's title is its pause (below), not the log entry that follows it
      if (e.type === "phase" && TITLED.has(phase) && !game.pacePhases) queue.current.push({ phase, round: Number(e.data?.round ?? game.round), key: i });
    }
    seen.current.n = game.log.length;
  }
  // a title waits for the events before it to play, then for the middle of the screen (see useStage)
  const waiting = queue.current.length;
  useEffect(() => {
    if (showing || current || !waiting) return;
    return whenSettled(() => setShowing(queue.current.shift() ?? null));
  }, [showing, current, waiting]);
  const pause = game.pending?.kind === "phase" ? game.pending : null;
  const [settled, setSettled] = useState<unknown>(null);
  useEffect(() => {
    if (!pause || current) return;
    return whenSettled(() => setSettled(pause));
  }, [pause, current]);
  const paused = !!pause && settled === pause && !current;
  const holds = useStage(paused ? `pause:${pause!.seq}` : showing ? `title:${showing.key}` : null);
  // the title appears (held at the pause, or passing): its swell
  const titled = holds && (paused || !!showing);
  useEffect(() => {
    if (titled) moment("phase");
  }, [titled]);
  if (!holds) return null;
  if (paused) return <PhasePause key={pause!.seq} />;
  if (!showing) return null;
  return (
    <div
      key={showing.key}
      className="phase-title"
      onAnimationEnd={(e) => {
        if (e.target !== e.currentTarget) return;
        setShowing(null);
      }}
    >
      <div className="phase-title-name">{tr(`phase.title.${showing.phase}`)}</div>
      <div className="phase-title-round">{tr("phase.round", { n: showing.round })}</div>
    </div>
  );
}

/**
 * A new investigator's turn gets a short title ("Daisy's turn") in the phase title's style, so a second turn in the same phase has a beginning.
 * None when the hand-off screen begins the turn (private hands), nor for the lead's first turn right after the investigation phase's title.
 */
function TurnTitle() {
  const game = useGame((s) => s.game)!;
  const setup = useGame((s) => s.setup);
  const current = useGame((s) => s.current);
  const locale = useGame((s) => s.locale);
  const seen = useRef<{ setup: unknown; n: number }>({ setup, n: game.log.length });
  const queue = useRef<{ inv: string; key: number }[]>([]);
  const [showing, setShowing] = useState<{ inv: string; key: number } | null>(null);
  if (seen.current.setup !== setup || game.log.length < seen.current.n) seen.current = { setup, n: game.log.length };
  if (game.log.length > seen.current.n) {
    const { privacy, revealedFor } = gameStore.getState();
    for (let i = seen.current.n; i < game.log.length; i++) {
      const e = game.log[i];
      if (e.type !== "turn" || !e.inv) continue;
      // the first turn of the phase (no turn since the phase entry) belongs to the lead who just saw the phase title
      let first = true;
      for (let k = i - 1; k >= 0 && game.log[k].type !== "phase"; k--) if (game.log[k].type === "turn") first = false;
      if (first && e.inv === game.lead) continue;
      if (!handVisible(privacy, game.order.length, e.inv, revealedFor)) continue;
      queue.current.push({ inv: e.inv, key: i });
    }
    seen.current.n = game.log.length;
  }
  const waiting = queue.current.length;
  useEffect(() => {
    if (showing || current || !waiting) return;
    return whenSettled(() => {
      // a turn already over (the player was quicker than the screen) gets no title
      const active = gameStore.getState().game?.active;
      while (queue.current.length && queue.current[0].inv !== active) queue.current.shift();
      setShowing(queue.current.shift() ?? null);
    });
  }, [showing, current, waiting]);
  const holds = useStage(showing ? `turn:${showing.key}` : null);
  if (!holds || !showing) return null;
  return (
    <div
      key={showing.key}
      className="phase-title turn-title"
      onAnimationEnd={(e) => {
        if (e.target !== e.currentTarget) return;
        setShowing(null);
      }}
    >
      <Portrait code={showing.inv} size={72} />
      <div className="phase-title-name">{tr("turn.title", { name: cardText(db, showing.inv, locale).name })}</div>
    </div>
  );
}

/** the paced pause: the coming phase's title stays until the lead investigator continues (button, Space or Enter) */
function PhasePause() {
  const game = useGame((s) => s.game)!;
  const locale = useGame((s) => s.locale);
  const choose = useGame((s) => s.choose);
  const p = game.pending!;
  const phase = (p.step as { phase?: string }).phase ?? "";
  const go = () => {
    moment("button");
    choose("continue");
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== " " && e.key !== "Enter") return;
      if ((e.target as HTMLElement | null)?.closest?.("button, input, textarea")) return;
      e.preventDefault();
      go();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [choose]);
  return (
    <div className="phase-title held">
      <div className="phase-title-name">{tr(`phase.title.${phase}`)}</div>
      <div className="phase-title-round">{tr("phase.round", { n: game.round })}</div>
      <button className="primary big phase-continue" onClick={go} autoFocus>
        {tr("phase.continue", { name: cardText(db, p.inv, locale).name })}
      </button>
    </div>
  );
}

/** navbar Journal button: switches the right-hand feed to the full scrollable history and back */
function JournalButton() {
  const mode = useView((s) => s.feedMode);
  return (
    <button className={mode === "journal" ? "primary" : ""} onClick={() => useView.getState().setFeedMode(mode === "journal" ? "live" : "journal")}>
      {tr("hud.journal")}
    </button>
  );
}

function TopBar() {
  // the button labels follow the language
  useGame((s) => s.locale);
  const toggle = useView((s) => s.toggle);
  const muted = useGame((s) => s.muted);
  const setMuted = useGame((s) => s.setMuted);
  return (
    <div className="topbar">
      <Ribbon />
      <div className="buttons">
        <button className={`mute-btn ${muted ? "muted" : ""}`} onClick={() => setMuted(!muted)} title={tr(muted ? "hud.unmute" : "hud.mute")} aria-pressed={muted}>
          {muted ? "🔇" : "🔊"}
        </button>
        <JournalButton />
        <button onClick={() => toggle("debug")}>{tr("hud.debug")}</button>
        <button onClick={() => gameStore.setState({ screen: "menu" })}>{tr("hud.menu")}</button>
      </div>
    </div>
  );
}

/** skill test in progress: who tests what, the value part by part vs difficulty, tokens, committed cards (a click takes one back) */
function SkillTestPanel() {
  const game = useGame((s) => s.game)!;
  const locale = useGame((s) => s.locale);
  const choose = useGame((s) => s.choose);
  const byCard = useOptionsByCard();
  const ref = useRef<HTMLDivElement>(null);
  // remember where committed cards are, so one taken back flies from here into the fan
  useLayoutEffect(() => {
    ref.current?.querySelectorAll<HTMLElement>("[data-card]").forEach((el) => rememberRect(el.dataset.card!, el));
  });
  // tokens still waiting for their draw animation aren't shown yet (the state already holds them)
  const unplayed = useGame((s) => [s.current, ...s.queue].filter((e) => e?.type === "token").length);
  const st = game.skillTest;
  // a card committed: its sound (one taken back makes none)
  const committed = st?.committed.length ?? 0;
  const lastCommitted = st?.committed.at(-1) ?? null;
  const wasCommitted = useRef(committed);
  useEffect(() => {
    if (committed > wasCommitted.current) moment("commit", lastCommitted);
    wasCommitted.current = committed;
  }, [committed, lastCommitted]);
  if (!st) return null;
  const p = testParts(gOf(), st);
  const tokens = st.tokens.slice(0, Math.max(0, st.tokens.length - unplayed));
  const sign = (n: number) => (n >= 0 ? ` + ${n}` : ` − ${-n}`);
  return (
    <div className="skilltest" ref={ref} data-tip="skilltest">
      <div className="st-title">
        {cardText(db, st.inv, locale).name} · {isIcon(st.skill) && <Icon name={st.skill} size={18} />} {tr(`stat.${st.skill}`)} · {st.sourceLabel}
      </div>
      <div className="st-calc">
        {p.icons.length > 0 || p.mods !== 0 ? (
          <span className="st-parts">
            {p.base}
            {p.icons.map((i) => sign(i.n)).join("")}
            {p.mods !== 0 && sign(p.mods)} ={" "}
          </span>
        ) : null}
        <span className="st-value">{p.total}</span> vs <span className="st-diff">{p.difficulty}</span>
        {tokens.length > 0 && (
          <span className="st-tokens">
            {tokens.map((tk, k) => (
              <ChaosTokenIcon key={k} token={tk} size={30} />
            ))}
          </span>
        )}
      </div>
      {st.committed.length > 0 && (
        <div className="st-committed">
          {st.committed.map((c) => {
            const back = byCard.get(c)?.find((o) => o.id === `un:${c}`);
            return (
              <div key={c} className={`st-commit-slot ${back ? "removable" : ""}`} title={back ? back.label : undefined}>
                <MiniCard id={c} w={86} h={120} legal={!!back} onClick={() => back && choose(back.id)} />
                {back && <span className="st-takeback">↶</span>}
              </div>
            );
          })}
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
  // the hand-off waits for whatever holds the middle of the screen (and drawn cards about to take it)
  const intro = useView((s) => s.stage.length > 0 || !!s.intro || s.showcase.length > 0);
  const viewer = viewerOf(game);
  // the pause before a phase is for the whole table: no hand to hide
  const hidden = busy || intro || !game.pending || game.pending.kind === "phase" || handVisible(privacy, game.order.length, viewer, revealedFor);
  useEffect(() => {
    if (!hidden) moment("handoff");
  }, [hidden]);
  if (hidden) return null;
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
      <div className="right-col">
        <ChaosBagButton />
        <InvTokens />
        <Feed />
      </div>
      <StatBar />
      <PlayStrip />
      <MulliganRow />
      <div className="center-col">
        <StepCaption />
        <InstructionBar />
        <SkillTestPanel />
      </div>
      <div className="right-dock">
        <CameraButtons />
        <UndoButton />
        <ActionRail />
      </div>
      <HoverCard />
      <Modals />
      <PopupMenu />
      <DebugPanel />
      <RevealOverlay />
      <ActionFloats />
      <HitFx />
      <EventPlayer />
      <PhaseTitle />
      <TurnTitle />
      <TipLayer />
      <SoundLayer />
      <Showcase />
      <IntroOverlay />
      <HandOff />
      <ScenarioEnd />
      <ErrorToast />
    </>
  );
}
