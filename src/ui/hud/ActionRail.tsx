import { cardText, t } from "../../content/i18n";
import type { ChoiceOption, GameState } from "../../engine/types";
import { db, useGame } from "../context";
import { Icon } from "../Icon";
import type { IconName } from "../icons";
import { optionHome } from "../optionHome";
import { handVisible } from "../scene/Table";
import { viewerOf } from "../store";

export interface RailItem {
  /** translation key, or null to show the engine's label */
  key: string | null;
  vars?: Record<string, string | number>;
  icon?: IconName;
  symbol?: string;
  primary: boolean;
}

const SKILLS = new Set(["willpower", "intellect", "combat", "agility"]);

/** icon and label for an option that has no card */
export function railItem(o: ChoiceOption): RailItem {
  const kind = (o.value as { kind?: string } | null)?.kind;
  if (kind === "draw") return { key: "rail.draw", icon: "cardBack", primary: false };
  if (kind === "resource") return { key: "rail.resource", icon: "resource", primary: false };
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

/** who decides and what about, one line at the top */
export function PromptBanner() {
  const game = useGame((s) => s.game) as GameState;
  const locale = useGame((s) => s.locale);
  const privacy = useGame((s) => s.privacy);
  const revealedFor = useGame((s) => s.revealedFor);
  const p = game.pending;
  if (!p || game.phase === "ended") return null;
  if (!handVisible(privacy, game.order.length, viewerOf(game), revealedFor)) return null;
  const name = cardText(db, p.inv, locale).name;
  // engine prompts often start with the investigator's English name already
  const prefix = `${db.cards[p.inv].name}:`;
  const text = p.prompt.startsWith(prefix) ? p.prompt.slice(prefix.length).trim() : p.prompt;
  return (
    <div className="prompt-banner">
      <b className="card-name">{name}:</b> {text}
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
  const items = p.options.filter((o) => optionHome(o, game, viewer) === "rail");
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
            <span className="rail-icon">{it.icon ? <Icon name={it.icon} size={30} /> : it.symbol}</span>
            <span className="rail-label">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
