import { useEffect, useMemo, useRef } from "react";
import { cardText, scenarioText, t } from "../../content/i18n";
import { actClueCost, doomInPlay } from "../../engine/rules/scenario";
import { difficultyOf, testValue } from "../../engine/rules/skillTest";
import type { GameEvent } from "../../engine/types";
import { db, gameStore, useGame } from "../context";
import { cardImage } from "../images";
import { ANIMATED, viewerOf } from "../store";
import { handVisible } from "../scene/Table";
import { glyphHtml } from "../glyphs";
import { ICON_LABELS, iconUrl, MARKUP_ICONS } from "../icons";
import { Stat } from "../Icon";
import { ActionRail, PromptBanner } from "./ActionRail";
import { ChaosTokenIcon } from "./ChaosTokenIcon";
import { Modals } from "./Modals";
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
  useEffect(() => {
    if (!current) return;
    const id = setTimeout(next, DURATION[current.type] ?? 500);
    return () => clearTimeout(id);
  }, [current, next]);
  if (!current) return null;
  return (
    <div className="event-banner" onClick={skip} title="Click to skip">
      <EventText e={current} />
    </div>
  );
}

function EventText({ e }: { e: GameEvent }) {
  if (e.type === "testResult") {
    const d = e.data as { success: boolean; tokens: string[] };
    return (
      <div className={`result ${d.success ? "ok" : "bad"}`}>
        {d.tokens.map((tk, k) => (
          <ChaosTokenIcon key={k} token={tk} size={34} />
        ))}{" "}
        {e.text}
      </div>
    );
  }
  if (e.type === "token") return <div className="result">Chaos token: <ChaosTokenIcon token={String(e.data?.token)} size={40} /></div>;
  return <div className="result">{e.text}</div>;
}

function TopBar() {
  const game = useGame((s) => s.game)!;
  const locale = useGame((s) => s.locale);
  const toggle = useView((s) => s.toggle);
  const g = gOf();
  const agenda = game.agenda ? db.cards[game.cards[game.agenda].code] : null;
  const act = game.act ? db.cards[game.cards[game.act].code] : null;
  const actCost = actClueCost(g);
  return (
    <div className="topbar">
      <div className="scen">
        <b>{scenarioText(db, game.scenarioId, locale).name}</b> · {tr("hud.round", { round: game.round, phase: game.phase })}
      </div>
      {agenda && (
        <div className="topbar-item" title={`Agenda: ${cardText(db, agenda.code, locale).name}`}>
          {cardText(db, agenda.code, locale).name} <Stat icon="doom" value={doomInPlay(g)} max={agenda.doom} size={20} />
        </div>
      )}
      {act && (
        <div className="topbar-item" title={`Act: ${cardText(db, act.code, locale).name}`}>
          {cardText(db, act.code, locale).name} {Number.isFinite(actCost) && <Stat icon="clue" value={actCost} size={20} />}
        </div>
      )}
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
      {st.committed.length > 0 && <div className="st-committed">Committed: {st.committed.map((c) => cardText(db, game.cards[c].code, locale).name).join(", ")}</div>}
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

/** large view of the hovered card */
function CardZoom() {
  const hovered = useView((s) => s.hovered);
  const game = useGame((s) => s.game)!;
  const locale = useGame((s) => s.locale);
  if (!hovered || !game.cards[hovered]) return null;
  const inst = game.cards[hovered];
  // hand cards: the raised fan card is the zoom (and other players' hands are never revealed)
  if (inst.zone === "hand") return null;
  const d = db.cards[inst.code];
  const tx = cardText(db, inst.code, locale);
  const unrevealed = d.type === "location" && !inst.revealed;
  const img = cardImage(d, unrevealed ? "back" : "front");
  return (
    <div className="zoom">
      {img && <img src={img} alt={tx.name} onError={(e) => (e.currentTarget.style.display = "none")} />}
      <div className="zoom-text">
        <b>{unrevealed ? tx.backName ?? tx.name : tx.name}</b>
        {tx.subname && <i> — {tx.subname}</i>}
        <div className="traits">{tx.traits?.join(". ")}</div>
        <p dangerouslySetInnerHTML={{ __html: formatText(unrevealed ? tx.backText ?? "" : tx.text) }} />
        <div className="zoom-state">
          {inst.damage > 0 && <span>Damage {inst.damage} </span>}
          {inst.horror > 0 && <span>Horror {inst.horror} </span>}
          {inst.clues > 0 && <span>Clues {inst.clues} </span>}
          {inst.doom > 0 && <span>Doom {inst.doom} </span>}
          {inst.uses > 0 && <span>{d.uses?.type ?? "uses"} {inst.uses} </span>}
          {inst.exhausted && <span>Exhausted</span>}
        </div>
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
      const icon = MARKUP_ICONS[k];
      if (icon) return `<img class="icon-inline" src="${iconUrl(icon)}" alt="${ICON_LABELS[icon]}" title="${k.replace("_", " ")}">`;
      return glyphHtml(k) ?? `<span class="icon icon-${k}" title="${k.replace("_", " ")}">${k.replace("_", " ")}</span>`;
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
  if (game.phase !== "ended" || busy) return null;
  const locale = useGame((s) => s.locale);
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
      <StatBar />
      <InvTokens />
      <div className="center-col">
        <PromptBanner />
        <SkillTestPanel />
      </div>
      <ActionRail />
      <CardZoom />
      <Modals />
      <PopupMenu />
      <LogPanel />
      <DebugPanel />
      <EventPlayer />
      <HandOff />
      <ScenarioEnd />
      <ErrorToast />
    </>
  );
}
