import { useEffect } from "react";
import { t } from "../../content/i18n";
import type { ChoiceOption, GameState } from "../../engine/types";
import { db, useGame } from "../context";
import { Icon } from "../Icon";
import type { IconName } from "../icons";
import { backUrl } from "../images";
import { promptParts } from "../feed";
import { onRail } from "../optionHome";
import { Sentence } from "./Feed";
import { handVisible } from "../scene/Table";
import { canUndo, viewerOf } from "../store";
import { useView } from "../view";

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

/** who decides and what about: portrait, class-coloured name and the translated, styled question */
export function PromptBanner() {
  const game = useGame((s) => s.game) as GameState;
  const locale = useGame((s) => s.locale);
  const privacy = useGame((s) => s.privacy);
  const revealedFor = useGame((s) => s.revealedFor);
  const p = game.pending;
  // the pause before a phase speaks for itself (the phase title)
  if (!p || game.phase === "ended" || p.kind === "phase") return null;
  if (!handVisible(privacy, game.order.length, viewerOf(game), revealedFor)) return null;
  const parts = promptParts(p, game, db, locale);
  // no translation for this prompt: the engine's English text, without the leading name (the banner shows it)
  const prefix = `${db.cards[p.inv].name}:`;
  const fallback = p.prompt.startsWith(prefix) ? p.prompt.slice(prefix.length).trim() : p.prompt;
  return (
    <div className="prompt-banner">
      <Sentence parts={[{ t: "inv", id: p.inv }, { t: "text", s: ": " }, ...(parts ?? [{ t: "text", s: fallback }])]} size={30} />
    </div>
  );
}

/** options that belong to no card, as icon buttons on the right side next to the hand */
export function ActionRail() {
  const game = useGame((s) => s.game) as GameState;
  const locale = useGame((s) => s.locale);
  const privacy = useGame((s) => s.privacy);
  const revealedFor = useGame((s) => s.revealedFor);
  const busy = useGame((s) => !!s.current || s.queue.length > 0);
  const choose = useGame((s) => s.choose);
  const p = game.pending;
  const viewer = viewerOf(game);
  if (!p || game.phase === "ended" || !handVisible(privacy, game.order.length, viewer, revealedFor)) return null;
  const items = p.options.filter((o) => onRail(o, game, viewer));
  if (!items.length) return null;
  return (
    <div className={`action-rail ${busy ? "busy" : ""}`}>
      {items.map((o) => {
        const it = railItem(o);
        // costs and extra detail stay visible: "[2 actions]" suffixes come from the engine label
        const extra = /\[(\d+ actions)\]$/.exec(o.label)?.[1];
        const label = it.key ? t(db, locale, it.key, it.vars) + (extra ? ` (${extra})` : "") : o.label;
        return (
          <button key={o.id} className={`rail-btn ${it.primary ? "primary" : ""}`} disabled={busy} onClick={() => choose(o.id)} title={o.label}>
            <span className="rail-icon">{it.img ? <img src={it.img} alt="" /> : it.icon ? <Icon name={it.icon} size={30} /> : it.symbol}</span>
            <span className="rail-label">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** take back the last choice (also Ctrl/Cmd+Z), down to the last reveal of hidden information */
export function UndoButton() {
  const locale = useGame((s) => s.locale);
  const able = useGame(canUndo);
  const ended = useGame((s) => s.game?.phase === "ended");
  const undo = useGame((s) => s.undo);
  const intro = useView((s) => !!s.intro);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "z" || !(e.ctrlKey || e.metaKey) || e.shiftKey) return;
      if ((e.target as HTMLElement | null)?.closest?.("input, textarea")) return;
      e.preventDefault();
      undo();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [undo]);
  if (ended) return null;
  return (
    <button className="undo-btn" disabled={!able || intro} onClick={undo} title={t(db, locale, able ? "undo.hint" : "undo.blocked")}>
      ↶ {t(db, locale, "undo.label")}
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
        ◎ {t(db, locale, "cam.focus")}
      </button>
      <button onClick={() => cmd("fit")} title={t(db, locale, "cam.fitHint")}>
        ⛶ {t(db, locale, "cam.fit")}
      </button>
    </div>
  );
}
