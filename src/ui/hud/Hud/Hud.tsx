import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { cardText, scenarioText, t } from "../../../content/i18n";
import type { GameEvent, GameState } from "../../../engine/types";
import { whenSettled } from "../../game/arrivals";
import { db, gameStore, useGame } from "../../state/context";
import { HELD, holdsForTap, viewerOf } from "../../state/store";
import {
  autoSwitchTarget,
  deckOptions,
  delayed,
  landingView,
  ownDecisionTitle,
} from "../../state/players";
import { phaseIsEmpty } from "../../game/phases";
import { useChoicesOffered } from "../../state/usePlayers";
import { hasSymbol, MARKUP_ICONS, markupColor } from "../../assets/icons";
import { ActionRail, CameraButtons, InstructionBar, UndoButton } from "../ActionRail";
import { moment, SoundLayer } from "../SoundLayer";
import { TipLayer } from "../TipLayer";
import { HoverCard } from "../HoverCard";
import { Feed } from "../Feed";
import { ActionFloats, HitFx, HIT_MS, ResourceFx } from "../Floats";
import { Modals } from "../Modals";
import { RevealOverlay } from "../Reveal";
import { ChaosBagButton } from "../ChaosBagButton";
import { PileColumn } from "../PileColumn";
import { PlayStrip } from "../PlayStrip";
import { ScenarioPanel } from "../ScenarioPanel";
import { PlayerBar } from "../PlayerBar";
import { Drawer } from "../Drawer";
import { Glyph, UiIcon } from "../../components/Icon";
import { useLayoutMode } from "../../state/layoutMode";
import { StatBar } from "../Stats";
import { MulliganRow } from "../MulliganRow";
import { IntroOverlay } from "../IntroOverlay";
import { Showcase } from "../Showcase";
import { StepCaption } from "../StepCaption";
import { guideHtml } from "../../game/guideText";
import { optionLabel } from "../../game/optionText";
import { InvestigatorChoiceOverlay } from "../InvestigatorChoice";
import { Ribbon } from "../Ribbon";
import { SkillTestScreen } from "../SkillTestScreen";
import { Portrait } from "../../components/Portrait";
import { spotlightNow } from "../../game/spotlight";
import { LangSwitch } from "../../components/LangSwitch";
import { useStage, useView } from "../../state/view";
import { cx } from "../../components/cx";
import styles from "./Hud.module.css";

const tr = (key: string, vars?: Record<string, string | number>) =>
  t(db, gameStore.getState().locale, key, vars);

/** how long each animated event holds the screen (ms) */
const DURATION: Record<string, number> = {
  enemyMove: 800,
  token: 650,
  testResult: 1300,
  encounter: 1400,
  attack: 700,
  spawn: 500,
  agendaAdvance: 1500,
  actAdvance: 1500,
  resolution: 800,
  enemyDefeated: 600,
  defeated: 1200,
  damage: 750,
  enemyDamage: 650,
  clues: 450,
  doom: 450,
};

/** the Slow pace holds every event this many times as long */
const SLOW = 1.6;

/** events that start only once every card on screen has landed: the chaos draw, and a hit from a card */
export const waitsForSettle = (e: GameEvent | null) =>
  e?.type === "token" || (e?.type === "damage" && !!e.data?.source);

/** events that take the middle of the screen (the rest play only while nothing holds it) */
const CENTER = new Set(["token", "testResult", "encounter", "weakness"]);

/** plays queued events one by one; input is blocked meanwhile */
function EventPlayer() {
  const current = useGame((s) => s.current);
  const next = useGame((s) => s.nextEvent);
  const byHand = useGame((s) => s.drawByHand);
  const pace = useGame((s) => s.pace);
  // a chaos token draw waits until every card on screen has landed
  const settledFor = useView((s) => s.settledFor);
  // so does a hit from a card (its streak and numbers follow a revealed location's flip)
  // a test's draw and result play inside the skill-test screen, which holds the stage for the whole test
  const testKey =
    current &&
    (current.type === "token" || current.type === "testResult") &&
    typeof current.data?.testId === "number"
      ? `test:${current.data.testId}`
      : null;
  const center = !!current && !testKey && CENTER.has(current.type);
  const holdsEvent = useStage(center ? `event:${current!.logIndex}` : null);
  const holds = useView((s) => (testKey ? s.stage[0] === testKey : holdsEvent));
  // other events play when nothing holds the middle, or only the test screen does (a fast ability's damage mid-test)
  const stageFree = useView((s) => s.stage.every((k) => k.startsWith("test:")));
  const ready =
    !!current &&
    (!waitsForSettle(current) || settledFor === current) &&
    (testKey || center ? holds : stageFree);
  // the event plays: everything else on the map dims around what it is about; once all is played, around the choice's options
  const game = useGame((s) => s.game);
  const queued = useGame((s) => s.queue.length > 0);
  // the choice behind a skill test (its committable cards) is spotlit while the test screen holds the stage
  const idle = !current && !queued && stageFree;
  useEffect(() => {
    const playing = ready ? current : null;
    useView.setState({
      playing,
      spotlight: game ? spotlightNow(game, viewerOf(game), playing, idle) : null,
    });
  }, [current, ready, game, idle]);
  useEffect(() => {
    if (!waitsForSettle(current)) return;
    return whenSettled(() => useView.setState({ settledFor: current }));
  }, [current]);
  // a token draw advances itself when its token has landed in the strip (by hand it waits for the tap first);
  // drawing by hand also waits for Continue on the result; at the Tap pace every big event waits for Next
  // a drawn encounter card or weakness waits in the showcase for the player's tap at every pace
  const waits =
    !!testKey && current?.type === "token"
      ? true
      : (byHand && current?.type === "testResult") ||
        holdsForTap(current, pace) ||
        (!!current && HELD.has(current.type));
  useEffect(() => {
    if (!current || waits || !ready) return;
    // a hit from a card plays its streak first, then the numbers
    const hit = current.type === "damage" && current.data?.source ? HIT_MS + 300 : 0;
    const slow = pace === "slow" ? SLOW : 1;
    const id = setTimeout(
      next,
      (current.type === "testResult" ? 1800 : (DURATION[current.type] ?? 500) + hit) * slow,
    );
    return () => clearTimeout(id);
  }, [current, next, waits, ready, pace]);
  if (!current || !ready) return null;
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
  const [showing, setShowing] = useState<{ phase: string; round: number; key: number } | null>(
    null,
  );
  // a new game (new or loaded) starts from its current log: nothing plays for phases already past; an undo shortens it
  if (seen.current.setup !== setup || game.log.length < seen.current.n)
    seen.current = { setup, n: game.log.length };
  if (game.log.length > seen.current.n) {
    for (let i = seen.current.n; i < game.log.length; i++) {
      const e = game.log[i];
      const phase = String(e.data?.phase ?? "");
      // a paced game's title is its pause (below), not the log entry that follows it
      if (e.type === "phase" && TITLED.has(phase) && !game.pacePhases)
        queue.current.push({ phase, round: Number(e.data?.round ?? game.round), key: i });
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
  // a phase with nothing to show (an enemy phase with no enemy to move or attack) goes on at once: no title, no pause
  const empty =
    paused && phaseIsEmpty(game, String((pause!.step as { phase?: string }).phase ?? ""));
  useEffect(() => {
    if (titled && !empty) moment("phase");
  }, [titled, empty]);
  if (!holds) return null;
  if (paused && empty) return <SkipPause key={pause!.seq} />;
  if (paused) return <PhasePause key={pause!.seq} />;
  if (!showing) return null;
  return (
    <div
      key={showing.key}
      className={styles.phaseTitle}
      onAnimationEnd={(e) => {
        if (e.target !== e.currentTarget) return;
        setShowing(null);
      }}
    >
      <div className={styles.phaseTitleName}>{tr(`phase.title.${showing.phase}`)}</div>
      <div className={styles.phaseTitleRound}>{tr("phase.round", { n: showing.round })}</div>
    </div>
  );
}

/**
 * A new investigator's turn, or a decision of their own when someone else is active (their own test in the mythos phase),
 * gets a short title ("Daisy's turn") in the phase title's style, so a second turn in the same phase has a beginning.
 * None for the lead's first turn right after the investigation phase's title, nor for a help to a teammate (a commit
 * window, a reaction): the table switches quietly (see AutoSwitch).
 */
function TurnTitle() {
  const game = useGame((s) => s.game)!;
  const setup = useGame((s) => s.setup);
  const current = useGame((s) => s.current);
  const locale = useGame((s) => s.locale);
  const seen = useRef<{ setup: unknown; n: number; prev: GameState | null }>({
    setup,
    n: game.log.length,
    prev: game,
  });
  // a turn title waits for its turn to still be the active one; a decision's for its investigator to still be deciding
  type Title = { inv: string; key: number; decision?: boolean };
  const queue = useRef<Title[]>([]);
  const [showing, setShowing] = useState<Title | null>(null);
  if (seen.current.setup !== setup || game.log.length < seen.current.n)
    seen.current = { setup, n: game.log.length, prev: game };
  if (seen.current.prev !== game) {
    const own = ownDecisionTitle(seen.current.prev, game);
    if (own) queue.current.push({ inv: own, key: -game.seq, decision: true });
    seen.current.prev = game;
  }
  if (game.log.length > seen.current.n) {
    for (let i = seen.current.n; i < game.log.length; i++) {
      const e = game.log[i];
      if (e.type !== "turn" || !e.inv) continue;
      // the first turn of the phase (no turn since the phase entry) belongs to the lead who just saw the phase title
      let first = true;
      for (let k = i - 1; k >= 0 && game.log[k].type !== "phase"; k--)
        if (game.log[k].type === "turn") first = false;
      if (first && e.inv === game.lead) continue;
      queue.current.push({ inv: e.inv, key: i });
    }
    seen.current.n = game.log.length;
  }
  const waiting = queue.current.length;
  useEffect(() => {
    if (showing || current || !waiting) return;
    return whenSettled(() => {
      // a turn already over (the player was quicker than the screen) gets no title
      const g = gameStore.getState().game;
      while (
        queue.current.length &&
        queue.current[0].inv !== (queue.current[0].decision ? g?.pending?.inv : g?.active)
      )
        queue.current.shift();
      setShowing(queue.current.shift() ?? null);
    });
  }, [showing, current, waiting]);
  const holds = useStage(showing ? `turn:${showing.key}` : null);
  const titled = showing?.key;
  useEffect(() => {
    if (titled !== undefined) moment("turn");
  }, [titled]);
  if (!holds || !showing) return null;
  return (
    <div
      key={showing.key}
      className={cx(styles.phaseTitle, styles.turnTitle)}
      onAnimationEnd={(e) => {
        if (e.target !== e.currentTarget) return;
        setShowing(null);
      }}
    >
      <Portrait code={showing.inv} size={72} />
      <div className={styles.phaseTitleName}>
        {tr("turn.title", { name: cardText(db, showing.inv, locale).name })}
      </div>
    </div>
  );
}

/** how long a teammate who can act waits before the table switches to them by itself */
export const AUTO_SWITCH_MS = 1000;

/**
 * When someone else can act (a commit to a teammate's test, a reaction) and their table isn't on screen, the table
 * switches to them by itself after about a second with nothing holding the middle of the screen; their avatar pulses
 * and the bar's button switch sooner. View state only (ADR-0004).
 */
function AutoSwitch() {
  const game = useGame((s) => s.game)!;
  const viewing = useView((s) => s.viewing);
  const busy = useGame((s) => !!s.current || s.queue.length > 0);
  const free = useView(
    (s) =>
      s.stage.every((k) => k.startsWith("test:") || k.startsWith("pause:")) &&
      !s.intro &&
      s.showcase.length === 0,
  );
  const target = autoSwitchTarget(game, { viewing });
  useEffect(() => {
    if (!target || busy || !free) return;
    return delayed(
      AUTO_SWITCH_MS,
      () => {
        const g = gameStore.getState().game;
        return !!g && autoSwitchTarget(g, { viewing: useView.getState().viewing }) === target;
      },
      () => useView.getState().setViewing(null),
    );
  }, [target, busy, free]);
  return null;
}

/** an empty phase's pause, answered at once (an ordinary choice, so replays and Undo see it like any other) */
function SkipPause() {
  const choose = useGame((s) => s.choose);
  useEffect(() => choose("continue"), [choose]);
  return null;
}

/** how long the coming phase's title waits for the lead investigator before it goes on by itself */
export const PHASE_AUTO_MS = 3000;

/**
 * The paced pause: the coming phase's title with the lead investigator's avatar ringed by a countdown; when the ring
 * closes (3 s) the phase begins by itself, a tap on the avatar (or Space or Enter) begins it sooner.
 */
function PhasePause() {
  const game = useGame((s) => s.game)!;
  const locale = useGame((s) => s.locale);
  const choose = useGame((s) => s.choose);
  const p = game.pending!;
  const phase = (p.step as { phase?: string }).phase ?? "";
  const name = cardText(db, p.inv, locale).name;
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
  useEffect(
    () =>
      delayed(
        PHASE_AUTO_MS,
        () => gameStore.getState().game?.pending?.seq === p.seq,
        () => {
          moment("countdown");
          choose("continue");
        },
      ),
    [p.seq, choose],
  );
  return (
    <div className={cx(styles.phaseTitle, "held")}>
      <div className={styles.phaseTitleName}>{tr(`phase.title.${phase}`)}</div>
      <div className={styles.phaseTitleRound}>{tr("phase.round", { n: game.round })}</div>
      <button
        className={cx(styles.phaseContinue, styles.phaseAvatar)}
        onClick={go}
        autoFocus
        title={tr("phase.continue", { name })}
        aria-label={tr("phase.continue", { name })}
      >
        <svg className={styles.phaseRing} viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="46" />
          <circle
            className={styles.phaseRingRun}
            cx="50"
            cy="50"
            r="46"
            style={{ animationDuration: `${PHASE_AUTO_MS}ms` }}
          />
        </svg>
        <Portrait code={p.inv} size={76} />
      </button>
    </div>
  );
}

/** navbar Journal button: switches the right-hand feed to the full scrollable history and back */
function JournalButton() {
  const mode = useView((s) => s.feedMode);
  return (
    <button
      className={mode === "journal" ? "primary" : ""}
      onClick={() => useView.getState().setFeedMode(mode === "journal" ? "live" : "journal")}
    >
      {tr("hud.journal")}
    </button>
  );
}

/** a drawn speaker in the ink colour, struck through while muted (an emoji would bring its own colours to the leather) */
function TopBar({ phone }: { phone: boolean }) {
  // the button labels follow the language
  useGame((s) => s.locale);
  const toggle = useView((s) => s.toggle);
  const muted = useGame((s) => s.muted);
  const setMuted = useGame((s) => s.setMuted);
  const journal = useView((s) => s.drawer === "right");
  return (
    <div className="topbar">
      <Ribbon />
      <PlayerBar />
      <div className={styles.buttons}>
        <LangSwitch compact={phone} />
        <button
          className={cx(styles.muteBtn, muted ? "muted" : "")}
          onClick={() => setMuted(!muted)}
          title={tr(muted ? "hud.unmute" : "hud.mute")}
          aria-label={tr("hud.mute")}
          aria-pressed={muted}
        >
          <UiIcon name={muted ? "mute" : "sound"} size={20} />
        </button>
        {phone ? (
          <>
            <button
              className={`icon-btn ${journal ? "primary" : ""}`}
              onClick={() => useView.getState().setDrawer(journal ? null : "right")}
              title={tr("hud.journal")}
              aria-label={tr("hud.journal")}
              aria-pressed={journal}
            >
              <Glyph name="tomes" size={22} title="" />
            </button>
            <ChaosBagButton size={30} />
          </>
        ) : (
          <JournalButton />
        )}
        <button
          className={phone ? "icon-btn" : ""}
          onClick={() => toggle("debug")}
          title={tr("hud.debug")}
          aria-label={tr("hud.debug")}
        >
          {phone ? <UiIcon name="debug" size={20} /> : tr("hud.debug")}
        </button>
        <button
          className={phone ? "icon-btn" : ""}
          onClick={() => gameStore.setState({ screen: "title" })}
          title={tr("hud.menu")}
          aria-label={tr("hud.menu")}
        >
          {phone ? <UiIcon name="menu" size={20} /> : tr("hud.menu")}
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
      // inline icons from the sprite, coloured like the printed ones where they have a colour; unknown markup as text
      const id = MARKUP_ICONS[k] ?? k;
      const title = k.replace(/_/g, " ");
      if (!hasSymbol(id)) return `<span class="icon icon-${k}" title="${title}">${title}</span>`;
      return `<svg class="svg-icon gl" width="1em" height="1em" role="img" aria-label="${title}"><title>${title}</title><use href="#${id}" fill="${markupColor(k) ?? "currentColor"}"/></svg>`;
    })
    .replace(/\n/g, "<br/>");
}

/** options for a card with several possible actions */
function PopupMenu() {
  const menu = useView((s) => s.menu);
  const close = useView((s) => s.closeMenu);
  const choose = useGame((s) => s.choose);
  const game = useGame((s) => s.game)!;
  const locale = useGame((s) => s.locale);
  if (!menu) return null;
  return (
    <div className={styles.popup} style={{ left: menu.x, top: menu.y }}>
      {menu.options.map((o) => (
        <button
          key={o.id}
          onClick={() => {
            close();
            choose(o.id);
          }}
        >
          {optionLabel(o, game, locale)}
        </button>
      ))}
    </div>
  );
}

// the dev-only sound picker (ADR-0010): not in the production build, where DEV is false and the import is dropped
const SoundPicker = import.meta.env.DEV ? lazy(() => import("../../dev/SoundPicker")) : null;

function DebugPanel() {
  const panel = useView((s) => s.panel);
  const game = useGame((s) => s.game)!;
  const setup = useGame((s) => s.setup);
  const actions = useGame((s) => s.actions);
  const autoStep = useGame((s) => s.autoStep);
  const exportLog = useGame((s) => s.exportLog);
  const importLog = useGame((s) => s.importLog);
  const file = useRef<HTMLInputElement>(null);
  const exportReport = useGame((s) => s.exportReport);
  const importReport = useGame((s) => s.importReport);
  // the bug report: copied to the clipboard (or shown selected when the browser refuses), or pasted back in to recreate a table
  const [copied, setCopied] = useState<"ok" | "manual" | null>(null);
  const [manual, setManual] = useState("");
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const manualBox = useRef<HTMLTextAreaElement>(null);
  const json = useMemo(
    () =>
      panel === "debug"
        ? JSON.stringify({ ...game, log: `(${game.log.length} entries)` }, null, 1)
        : "",
    [game, panel],
  );
  if (panel !== "debug") return null;
  const download = () => {
    const blob = new Blob([exportLog()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `arkham-${game.scenarioId}-${setup?.seed}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const copyReport = async () => {
    const text = exportReport();
    try {
      await navigator.clipboard.writeText(text);
      setCopied("ok");
      setManual("");
    } catch {
      // clipboard refused (an insecure page, a blocked permission): show it selected, ready to copy by hand
      setManual(text);
      setCopied("manual");
      setTimeout(() => manualBox.current?.select(), 0);
    }
  };
  const loadReport = () => {
    try {
      importReport(pasted);
      setPasteError(null);
      setPasting(false);
      setPasted("");
    } catch (err) {
      setPasteError((err as Error).message);
    }
  };
  return (
    <div className={cx(styles.sidePanel, styles.debug)}>
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
      <div className="row">
        <button className="primary" onClick={copyReport}>
          {tr("debug.copyReport")}
        </button>
        <button
          onClick={() => {
            setPasting(!pasting);
            setPasteError(null);
          }}
        >
          {tr("debug.pasteReport")}
        </button>
        {copied === "ok" && <span className={styles.reportOk}>{tr("debug.copied")}</span>}
        {SoundPicker && <button onClick={() => setPicking(true)}>Sounds</button>}
      </div>
      {SoundPicker && picking && (
        <Suspense fallback={null}>
          <SoundPicker onClose={() => setPicking(false)} />
        </Suspense>
      )}
      {copied === "manual" && (
        <div className={styles.reportCopy}>
          <div className="problems">{tr("debug.copyRefused")}</div>
          <textarea
            ref={manualBox}
            readOnly
            value={manual}
            onFocus={(e) => e.currentTarget.select()}
            aria-label={tr("debug.copyReport")}
          />
        </div>
      )}
      {pasting && (
        <div className={styles.reportPaste}>
          <textarea
            value={pasted}
            placeholder={tr("debug.pastePlaceholder")}
            onChange={(e) => setPasted(e.target.value)}
            aria-label={tr("debug.pasteReport")}
          />
          <div className="row">
            <button className="primary" disabled={!pasted.trim()} onClick={loadReport}>
              {tr("debug.load")}
            </button>
          </div>
          {pasteError && <div className="problems">{pasteError}</div>}
        </div>
      )}
      <textarea readOnly value={json} />
    </div>
  );
}

function ScenarioEnd() {
  const game = useGame((s) => s.game)!;
  const finish = useGame((s) => s.finishScenario);
  const busy = useGame((s) => !!s.current || s.queue.length > 0);
  const locale = useGame((s) => s.locale);
  const over = game.phase === "ended" && !busy;
  const won = over && Object.values(game.invs).some((i) => i.status !== "defeated");
  useEffect(() => {
    if (won) moment("victory");
  }, [won]);
  if (!over) return null;
  const r = scenarioText(db, game.scenarioId, locale).resolution(game.resolution ?? "none");
  return (
    <div className="handoff">
      <div className={cx(styles.handoffBox, styles.resolution)}>
        <h2>{r?.title ?? game.resolution}</h2>
        <div
          className={styles.resolutionText}
          dangerouslySetInnerHTML={{ __html: guideHtml(r?.text ?? "") }}
        />
        <button className="primary big" onClick={finish}>
          {tr("log.title")} →
        </button>
      </div>
    </div>
  );
}

function ErrorToast() {
  const error = useGame((s) => s.error);
  if (!error) return null;
  return (
    <div className="error" onClick={() => gameStore.setState({ error: null })}>
      {error}
    </div>
  );
}

/** the view returns to the deciding player's table (or stays on the active one while another can act) whenever the decision passes */
function useViewReset() {
  const game = useGame((s) => s.game);
  const decider = game ? viewerOf(game) : null;
  // cards still in the showcase (a mulligan redraw) keep their owner's table until they are taken
  const held = useView((s) => s.showcase.length > 0);
  useEffect(() => {
    if (held) return;
    const g = gameStore.getState().game;
    useView.getState().setViewing(g ? landingView(g) : null);
  }, [decider, held]);
}

/** the bar's top edge as --bar-top on the page: the mulligan row stays above the bar however far it wraps */
function useBarTop() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const root = document.documentElement.style;
    const ro = new ResizeObserver(() =>
      root.setProperty("--bar-top", `${el.getBoundingClientRect().top}px`),
    );
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.removeProperty("--bar-top");
    };
  }, []);
  return ref;
}

export function Hud() {
  useViewReset();
  // the phone layout (ADR-0005): one thin bar, the panels and the Journal in drawers, the rail's actions in the bar
  const phone = useLayoutMode() === "phone";
  const centerCol = useBarTop();
  return (
    <>
      <TopBar phone={phone} />
      {phone ? (
        <PhoneDrawers />
      ) : (
        <>
          <ScenarioPanel />
          <PileColumn />
          <div className={styles.rightCol}>
            <ChaosBagButton />
            <Feed />
          </div>
          <StatBar />
        </>
      )}
      {phone ? (
        <PlayStrip />
      ) : (
        <>
          <PlayStrip part="threats" />
          <PlayStrip part="assets" />
        </>
      )}
      <MulliganRow />
      <div className={styles.centerCol} ref={centerCol}>
        <StepCaption />
        <InstructionBar />
      </div>
      <div className="right-dock">
        <CameraButtons />
        <UndoButton />
        {!phone && <ActionRail />}
      </div>
      <HoverCard />
      <Modals />
      <PopupMenu />
      <DebugPanel />
      <RevealOverlay />
      <ActionFloats />
      <HitFx />
      <ResourceFx />
      <SkillTestScreen />
      <EventPlayer />
      <PhaseTitle />
      <TurnTitle />
      <InvestigatorChoiceOverlay />
      <AutoSwitch />
      <TipLayer />
      <SoundLayer />
      <Showcase />
      <IntroOverlay />
      <ScenarioEnd />
      <ErrorToast />
    </>
  );
}

/** the phone's drawers: the act, agenda and piles on the left, the Journal on the right (opened from its icon in the bar too) */
function PhoneDrawers() {
  useGame((s) => s.locale);
  const game = useGame((s) => s.game)!;
  const offered = useChoicesOffered();
  // a deck waiting for a tap sits in the closed left drawer: its handle glows (the bar's Draw button answers too)
  const deckWaits = offered && deckOptions(game, viewerOf(game)).waiting;
  const right = useView((s) => s.drawer === "right");
  // the right drawer is the Journal: the full history while it is open
  useEffect(() => {
    useView.getState().setFeedMode(right ? "journal" : "live");
  }, [right]);
  return (
    <>
      <Drawer edge="left" handle="›" label={tr("phone.panels")} glow={deckWaits}>
        <ScenarioPanel />
        <PileColumn />
      </Drawer>
      <Drawer edge="right" handle="‹" label={tr("hud.journal")}>
        {right && <Feed />}
      </Drawer>
    </>
  );
}
