import { useEffect } from "react";
import { cardText, t } from "../../content/i18n";
import type { ChoiceOption, GameState } from "../../engine/types";
import { db, useGame } from "../context";
import { Icon } from "../Icon";
import type { IconName } from "../icons";
import { backUrl } from "../images";
import { instructionParts } from "../instruction";
import { inBar, onRail } from "../optionHome";
import { useLayoutMode } from "../layoutMode";
import { Sentence } from "./Feed";
import { canUndo, viewerOf } from "../store";
import { barAsk } from "../players";
import { useChoicesOffered } from "../usePlayers";
import { useView } from "../view";
import { moment } from "./SoundLayer";
import { useCaption, useHeld } from "./StepCaption";

export interface RailItem {
  /** translation key, or null to show the engine's label */
  key: string | null;
  vars?: Record<string, string | number>;
  icon?: IconName;
  /** an image instead of an icon (the card back for Draw) */
  img?: string;
  symbol?: string;
  primary: boolean;
}

const SKILLS = new Set(["willpower", "intellect", "combat", "agility"]);

/** icon and label for an option that has no card */
export function railItem(o: ChoiceOption): RailItem {
  const kind = (o.value as { kind?: string } | null)?.kind;
  if (kind === "draw") return { key: "rail.draw", img: backUrl("player"), primary: false };
  if (kind === "resource") return { key: "rail.resource", icon: "resource", primary: false };
  if (kind === "investigate") return { key: "rail.investigate", icon: "intellect", primary: false };
  if (kind === "endTurn") return { key: "rail.endTurn", symbol: "⏎", primary: true };
  if (o.id === "done") {
    const redraw = /^Redraw (\d+)/.exec(o.label);
    if (redraw) return { key: "rail.redraw", vars: { n: redraw[1] }, symbol: "↻", primary: true };
    return { key: /^Keep hand/.test(o.label) ? "rail.keep" : "rail.done", symbol: "✔", primary: true };
  }
  if (o.id === "pass") return { key: "rail.pass", symbol: "»", primary: true };
  if (o.id === "none") return { key: "rail.nothing", symbol: "✖", primary: false };
  if (/^Resign/.test(o.label)) return { key: "rail.resign", symbol: "⚑", primary: false };
  if (typeof o.value === "string" && SKILLS.has(o.value)) return { key: null, icon: o.value as IconName, primary: false };
  return { key: null, symbol: "•", primary: false };
}

/** a short label and icon for an option shown as a button on its card in the play strip */
export function stripAction(o: ChoiceOption, cardName: string, locale: string): { label: string; icon?: IconName } {
  const kind = (o.value as { kind?: string } | null)?.kind;
  if (kind === "fight") return { label: t(db, locale, "strip.fight"), icon: "combat" };
  if (kind === "evade") return { label: t(db, locale, "strip.evade"), icon: "agility" };
  if (kind === "engage") return { label: t(db, locale, "strip.engage") };
  // the engine label without the card's own name: "Use .45 Automatic" → "Use", "Machete: fight" → "fight"
  const short = o.label.replace(cardName, "").replace(/^[\s:·-]+|[\s:·-]+$/g, "").replace(/\s{2,}/g, " ");
  if (/^Use$/i.test(short)) return { label: t(db, locale, "strip.use") };
  const label = short || o.label;
  return { label: label[0].toUpperCase() + label.slice(1) };
}

/** the action, reaction or free symbol of an option that uses a card ability (from the ability's kind), else null */
export function abilitySymbol(o: ChoiceOption, game: Pick<GameState, "cards">): "action" | "reaction" | "free" | null {
  const v = o.value as { kind?: string; card?: string; index?: number; ability?: { ability: { kind: string } } } | string | null;
  // a reaction choice is "card:index"; a turn option { kind: "ability", card, index }; a fast ability during a test carries its ability
  const m = typeof v === "string" ? /^(.+):(\d+)$/.exec(v) : null;
  const ref = m ? { card: m[1], index: +m[2] } : typeof v === "object" && v?.kind === "ability" ? { card: v.card!, index: v.index! } : null;
  const code = ref && game.cards[ref.card]?.code;
  const kind = typeof v === "object" && v?.ability ? v.ability.ability.kind : code ? [...(db.cards[code]?.abilities ?? []), ...(db.scripts[code]?.abilities ?? [])][ref!.index]?.kind : null;
  return kind === "action" ? "action" : kind === "reaction" ? "reaction" : kind === "fast" ? "free" : null;
}

/** rail and bar buttons the tips point at */
const TIP_OF: Record<string, string> = { "rail.investigate": "investigate", "rail.endTurn": "endTurn" };

/** a no-card option as an icon button; End turn glows when nothing is left to spend */
function OptionButton({ o, game, busy }: { o: ChoiceOption; game: GameState; busy: boolean }) {
  const locale = useGame((s) => s.locale);
  const choose = useGame((s) => s.choose);
  const it = railItem(o);
  // costs and extra detail stay visible: "[2 actions]" suffixes come from the engine label
  const extra = /\[(\d+ actions)\]$/.exec(o.label)?.[1];
  const label = it.key ? t(db, locale, it.key, it.vars) + (extra ? ` (${extra})` : "") : o.label;
  // no actions left: End turn is the thing to do (paid actions are no longer offered, free ones stay)
  const me = game.pending?.kind === "turn" ? game.invs[game.pending.inv] : null;
  const spent = !!me && me.actionsLeft + me.restrictedActions.reduce((n, r) => n + r.left, 0) === 0;
  return (
    <button className={`rail-btn ${it.primary ? "primary" : ""} ${spent && it.key === "rail.endTurn" ? "glow" : ""}`} disabled={busy} onClick={() => { moment("button"); choose(o.id); }} title={o.label} aria-label={label} data-tip={TIP_OF[it.key ?? ""]}>
      <span className="rail-icon">{it.img ? <img src={it.img} alt="" /> : it.icon ? <Icon name={it.icon} size={30} /> : it.symbol}</span>
      <span className="rail-label">{label}</span>
    </button>
  );
}

/** the pending choice of the investigator whose hand is on screen, or null (none, the phase pause, the end) */
function useOwnChoice() {
  const game = useGame((s) => s.game) as GameState;
  const p = game.pending;
  if (!p || game.phase === "ended") return null;
  return p;
}

/** who decides, what to tap in plain words, and the buttons that answer the question (Done, Pass, End turn…) */
export function InstructionBar() {
  const game = useGame((s) => s.game) as GameState;
  const locale = useGame((s) => s.locale);
  const busy = useGame((s) => !!s.current || s.queue.length > 0);
  const p = useOwnChoice();
  const viewing = useView((s) => s.viewing);
  const mode = useLayoutMode();
  // while a phase step plays out, its caption has this place
  const caption = useCaption();
  const held = useHeld();
  // the pause before a phase speaks for itself (the phase title); while events play the bar shows no choice
  if (busy || caption !== null || held || !p || p.kind === "phase") return null;
  const viewer = viewerOf(game);
  const ask = barAsk(game, { viewing });
  // someone else can act and their table isn't on screen: who, and the switch to them (the avatar's tap)
  if (ask.kind === "handoff") {
    const name = cardText(db, ask.inv, locale).name;
    return (
      <div className="instruction-bar" data-tip="bar">
        <Sentence parts={[{ t: "inv", id: ask.inv }, { t: "text", s: " " }, { t: "text", s: t(db, locale, ask.key, { name }).replace(name, "").trim() }]} size={30} />
        <div className="bar-buttons">
          <button className="primary" onClick={() => { moment("button"); useView.getState().setViewing(null); }}>
            {t(db, locale, "players.switchTo", { name })}
          </button>
        </div>
      </div>
    );
  }
  // the decider's instruction stays while looking at a teammate; its buttons come back with the decider's table
  // the phone's bar also takes the rail's actions and the act's and agenda's options (ADR-0005)
  const buttons = ask.buttons ? p.options.filter((o) => inBar(o, game, viewer, mode)) : [];
  return (
    <div className="instruction-bar" data-tip="bar">
      <Sentence parts={[{ t: "inv", id: p.inv }, { t: "text", s: ": " }, ...instructionParts(p, game, db, locale)]} size={30} />
      {buttons.length > 0 && (
        <div className="bar-buttons">
          {buttons.map((o) => (
            <OptionButton key={o.id} o={o} game={game} busy={busy} />
          ))}
        </div>
      )}
    </div>
  );
}

/** the actions that stand for something to do (Draw, Gain resource, Investigate), as icon buttons next to the hand */
export function ActionRail() {
  const game = useGame((s) => s.game) as GameState;
  const busy = useGame((s) => !!s.current || s.queue.length > 0);
  const p = useOwnChoice();
  const offered = useChoicesOffered();
  if (!p || !offered) return null;
  const items = p.options.filter((o) => onRail(o, game, viewerOf(game)));
  if (!items.length) return null;
  return (
    <div className={`action-rail ${busy ? "busy" : ""}`}>
      {items.map((o) => (
        <OptionButton key={o.id} o={o} game={game} busy={busy} />
      ))}
    </div>
  );
}

/** take back the last choice (also Ctrl/Cmd+Z), down to the last reveal of hidden information */
export function UndoButton() {
  const locale = useGame((s) => s.locale);
  const able = useGame(canUndo);
  const ended = useGame((s) => s.game?.phase === "ended");
  const undoStore = useGame((s) => s.undo);
  const undo = () => {
    moment("undo");
    undoStore();
  };
  const intro = useView((s) => !!s.intro);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "z" || !(e.ctrlKey || e.metaKey) || e.shiftKey) return;
      if ((e.target as HTMLElement | null)?.closest?.("input, textarea")) return;
      e.preventDefault();
      moment("undo");
      undoStore();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [undoStore]);
  if (ended) return null;
  return (
    <button className="undo-btn" data-tip="undo" disabled={!able || intro} onClick={undo} title={t(db, locale, able ? "undo.hint" : "undo.blocked")}>
      ↶ <span className="btn-word">{t(db, locale, "undo.label")}</span>
    </button>
  );
}

/** map camera shortcuts: back to the deciding investigator's location, or the whole map */
export function CameraButtons() {
  const locale = useGame((s) => s.locale);
  const cmd = useView((s) => s.cameraCommand);
  return (
    <div className="camera-buttons">
      <button onClick={() => cmd("focus")} title={t(db, locale, "cam.focusHint")}>
        ◎ <span className="btn-word">{t(db, locale, "cam.focus")}</span>
      </button>
      <button onClick={() => cmd("fit")} title={t(db, locale, "cam.fitHint")}>
        ⛶ <span className="btn-word">{t(db, locale, "cam.fit")}</span>
      </button>
    </div>
  );
}
