import { useEffect, useMemo, useRef } from "react";
import { cardText, t } from "../../content/i18n";
import { actClueCost, doomInPlay } from "../../engine/rules/scenario";
import { difficultyOf, testValue } from "../../engine/rules/skillTest";
import type { ChoiceOption, GameEvent } from "../../engine/types";
import { db, gameStore, useGame } from "../context";
import { cardImage } from "../images";
import { ANIMATED, viewerOf } from "../store";
import { handVisible } from "../scene/Table";
import { GLYPHS, ICON_LABELS, iconUrl, MARKUP_ICONS } from "../icons";
import { Stat } from "../Icon";
import { ChaosTokenIcon } from "./ChaosTokenIcon";
import { PlayerPlaques, StatBar } from "./Stats";
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
        <b>{db.scenarios[game.scenarioId].name}</b> · {tr("hud.round", { round: game.round, phase: game.phase })}
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
      <PlayerPlaques />
      <div className="buttons">
        <button onClick={() => toggle("log")}>{tr("hud.log")}</button>
        <button onClick={() => toggle("debug")}>{tr("hud.debug")}</button>
        <button onClick={() => gameStore.setState({ screen: "menu" })}>{tr("hud.menu")}</button>
      </div>
    </div>
  );
}

/** the pending choice as buttons (card-linked options are also clickable on the table) */
function Prompt() {
  const game = useGame((s) => s.game)!;
  const choose = useGame((s) => s.choose);
  const busy = useGame((s) => !!s.current || s.queue.length > 0);
  const locale = useGame((s) => s.locale);
  const privacy = useGame((s) => s.privacy);
  const revealedFor = useGame((s) => s.revealedFor);
  const p = game.pending;
  if (!p || game.phase === "ended") return null;
  // the options can name cards in hand: never show them before the hand-off is confirmed
  if (!handVisible(privacy, game.order.length, viewerOf(game), revealedFor)) return null;
  const who = cardText(db, p.inv, locale).name;
  const groups = groupOptions(p.options);
  return (
    <div className={`prompt ${busy ? "busy" : ""}`}>
      <div className="prompt-who">{who}</div>
      <div className="prompt-text">{p.prompt}</div>
      {groups.map(([title, opts]) => (
        <div key={title} className="prompt-group">
          {title && <div className="prompt-group-title">{title}</div>}
          {opts.map((o) => (
            <button
              key={o.id}
              disabled={busy}
              className={o.id === "done" || o.label === "End turn" || o.id === "pass" ? "primary" : ""}
              onMouseEnter={() => o.card && useView.getState().setHovered(o.card)}
              onMouseLeave={() => useView.getState().setHovered(null)}
              onClick={() => choose(o.id)}
            >
              {o.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function groupOptions(options: ChoiceOption[]): [string, ChoiceOption[]][] {
  const groups = new Map<string, ChoiceOption[]>();
  for (const o of options) {
    const k = /^(Move|Investigate)/.test(o.label) ? "Explore" : /^(Fight|Engage|Evade)/.test(o.label) ? "Enemies" : /^Play/.test(o.label) ? "Play" : /:/.test(o.label) && !/^Done/.test(o.label) ? "Abilities" : "";
    groups.set(k, [...(groups.get(k) ?? []), o]);
  }
  const order = ["Explore", "Enemies", "Play", "Abilities", ""];
  return order.filter((k) => groups.has(k)).map((k) => [k, groups.get(k)!]);
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
      return `<span class="icon icon-${k}" title="${k.replace("_", " ")}">${GLYPHS[k] ?? ICON[k] ?? k}</span>`;
    })
    .replace(/\n/g, "<br/>");
}
const ICON: Record<string, string> = { action: "➤", reaction: "↺", fast: "⚡", free: "⚡", elder_sign: "✶", skull: "☠", cultist: "☥", tablet: "⌘", elder_thing: "✵", auto_fail: "✖", willpower: "WIL", intellect: "INT", combat: "COM", agility: "AGI", per_investigator: "/inv" };

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
  const r = db.scenarios[game.scenarioId].resolutions[game.resolution ?? "none"];
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
      <div className="right-col">
        <SkillTestPanel />
        <Prompt />
      </div>
      <CardZoom />
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
