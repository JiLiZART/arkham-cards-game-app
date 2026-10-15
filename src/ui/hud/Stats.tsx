import { useEffect, useRef, useState } from "react";
import { cardText } from "../../content/i18n";
import { SKILLS } from "../../content/schema";
import { maxHealth, maxSanity, skillValue } from "../../engine/core";
import type { GameState, InvId } from "../../engine/types";
import { db, useGame } from "../context";
import { Icon, Stat } from "../Icon";
import { GLYPHS, isIcon } from "../icons";
import { cardImage } from "../images";
import { viewerOf } from "../store";
import { STAT_BAR_W } from "./fan";

/** true for a moment after the value changes */
export function useFlash(value: unknown): boolean {
  const [on, setOn] = useState(false);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current === value) return;
    prev.current = value;
    setOn(true);
    const id = setTimeout(() => setOn(false), 600);
    return () => clearTimeout(id);
  }, [value]);
  return on;
}

function FlashStat(props: Parameters<typeof Stat>[0]) {
  const flash = useFlash(props.value);
  return <Stat {...props} flash={flash} />;
}

function invNumbers(game: GameState, i: InvId) {
  const g = { s: game, db, events: [] };
  const st = game.invs[i];
  return {
    health: maxHealth(g, i) - st.damage,
    maxHealth: maxHealth(g, i),
    sanity: maxSanity(g, i) - st.horror,
    maxSanity: maxSanity(g, i),
    resources: st.resources,
    clues: st.clues,
    actions: game.active === i ? st.actionsLeft : null,
    skills: SKILLS.map((s) => [s, skillValue(g, i, s)] as const),
  };
}

function Portrait({ code, size }: { code: string; size: number }) {
  const url = cardImage(db.cards[code], "front");
  return <div className="portrait" style={{ width: size, height: size, backgroundImage: url ? `url(${url})` : undefined }} />;
}

/** the viewing investigator's stats, bottom-left next to the hand (Hearthstone hero area) */
export function StatBar() {
  const game = useGame((s) => s.game) as GameState;
  const locale = useGame((s) => s.locale);
  const viewer = viewerOf(game);
  if (!viewer || !game.invs[viewer]) return null;
  const n = invNumbers(game, viewer);
  const d = db.cards[viewer];
  const tx = cardText(db, viewer, locale);
  return (
    <div className="stat-bar" style={{ width: STAT_BAR_W }}>
      <div className="stat-head">
        <Portrait code={viewer} size={64} />
        <div>
          <div className="stat-name">
            {isIcon(d.faction) && <Icon name={d.faction} size={18} />} {tx.name}
          </div>
          <div className="stat-row">
            <FlashStat icon="health" value={n.health} max={n.maxHealth} size={26} />
            <FlashStat icon="sanity" value={n.sanity} max={n.maxSanity} size={26} />
          </div>
        </div>
      </div>
      <div className="stat-row">
        <FlashStat icon="resource" value={n.resources} size={24} />
        <FlashStat icon="clue" value={n.clues} size={24} />
        {n.actions !== null && (
          <span className="stat" title="Actions left">
            <span className="glyph">{GLYPHS.actions}</span>
            <b>{n.actions}</b>
          </span>
        )}
      </div>
      <div className="stat-row skills">
        {n.skills.map(([s, v]) => (
          <FlashStat key={s} icon={s} value={v} size={22} />
        ))}
      </div>
    </div>
  );
}

/** compact plaques for the other investigators (top bar) */
export function PlayerPlaques() {
  const game = useGame((s) => s.game) as GameState;
  const locale = useGame((s) => s.locale);
  const viewer = viewerOf(game);
  return (
    <div className="plaques">
      {game.order
        .filter((i) => i !== viewer)
        .map((i) => {
          const n = invNumbers(game, i);
          const st = game.invs[i];
          return (
            <div key={i} className={`plaque ${game.active === i ? "active" : ""} ${st.status}`} title={st.status !== "playing" ? st.status : undefined}>
              <Portrait code={i} size={30} />
              <span className="plaque-name">{cardText(db, i, locale).name}</span>
              <FlashStat icon="health" value={n.health} size={18} />
              <FlashStat icon="sanity" value={n.sanity} size={18} />
              <FlashStat icon="resource" value={n.resources} size={18} />
              <FlashStat icon="clue" value={n.clues} size={18} />
              {game.active === i && <span className="glyph" title="Taking a turn">{GLYPHS.actions}{n.actions}</span>}
            </div>
          );
        })}
    </div>
  );
}
