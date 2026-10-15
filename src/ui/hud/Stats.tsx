import { useEffect, useRef, useState } from "react";
import { cardText, t } from "../../content/i18n";
import { SKILLS } from "../../content/schema";
import { maxHealth, maxSanity, skillValue } from "../../engine/core";
import type { GameState, InvId } from "../../engine/types";
import { db, gameStore, useGame } from "../context";
import { Glyph, Icon, Stat } from "../Icon";
import { isIcon, type IconName } from "../icons";
import { optionHome } from "../optionHome";
import { Portrait } from "../Portrait";
import { viewerOf } from "../store";
import { useView } from "../view";
import { useCardOptions } from "./Modals";
import { STAT_BAR_W } from "./fan";
import { stackTokens } from "./tokenStack";

const tr = (key: string, vars?: Record<string, string | number>) => t(db, gameStore.getState().locale, key, vars);

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

export function FlashStat(props: Parameters<typeof Stat>[0]) {
  const flash = useFlash(props.value);
  return <Stat {...props} flash={flash} />;
}

export function invNumbers(game: GameState, i: InvId) {
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

const STACKS: Record<"resource" | "clue", { denominations: number[]; art: Record<number, IconName> }> = {
  resource: { denominations: [5, 3, 1], art: { 5: "resource-5", 3: "resource-3", 1: "resource" } },
  clue: { denominations: [3, 1], art: { 3: "clue-3", 1: "clue" } },
};

/** resources or clues as a pile of physical tokens (fewest tokens), followed by the total */
export function TokenStack({ kind, value, size = 40 }: { kind: "resource" | "clue"; value: number; size?: number }) {
  const flash = useFlash(value);
  const { denominations, art } = STACKS[kind];
  const tokens = stackTokens(value, denominations);
  const tip = `${tr(kind === "resource" ? "stat.resources" : "stat.clues")} ${value}`;
  return (
    <div className={`token-stack ${flash ? "flash" : ""}`} title={tip} aria-label={tip}>
      <div className="token-pile" style={{ width: size + Math.max(0, tokens.length - 1) * size * 0.45, height: size }}>
        {tokens.length === 0 && (
          <span className="token-empty">
            <Icon name={art[1]} size={size} title={tip} />
          </span>
        )}
        {tokens.map((d, k) => (
          <span key={k} style={{ left: k * size * 0.45, zIndex: tokens.length - k }}>
            <Icon name={art[d]} size={size} title={tip} />
          </span>
        ))}
      </div>
      <b>{value}</b>
    </div>
  );
}

/** stats shared by the viewer's bar and the investigator modal */
export function StatBody({ inv, onPortrait, legal }: { inv: InvId; onPortrait?: () => void; legal?: boolean }) {
  const game = useGame((s) => s.game) as GameState;
  const locale = useGame((s) => s.locale);
  const n = invNumbers(game, inv);
  const d = db.cards[inv];
  const tx = cardText(db, inv, locale);
  return (
    <>
      <div className="token-row">
        <TokenStack kind="resource" value={n.resources} />
        <TokenStack kind="clue" value={n.clues} />
      </div>
      <div className="stat-bar">
        <button className={`portrait-btn ${legal ? "legal" : ""}`} onClick={onPortrait} title={tx.name} disabled={!onPortrait}>
          <Portrait code={inv} size={120} active={game.active === inv} />
        </button>
        <div className="stat-main">
          <div className="stat-name">
            {isIcon(d.faction) && <Icon name={d.faction} size={24} />} {tx.name}
          </div>
          <div className="stat-row">
            <FlashStat icon="health" value={n.health} max={n.maxHealth} size={44} label={tr("stat.health")} />
            <FlashStat icon="sanity" value={n.sanity} max={n.maxSanity} size={44} label={tr("stat.sanity")} />
          </div>
          {n.actions !== null && (
            <div className="stat-row actions" title={`${tr("stat.actions")} ${n.actions}`} aria-label={`${tr("stat.actions")} ${n.actions}`}>
              {Array.from({ length: Math.max(n.actions, 0) }, (_, k) => (
                <Glyph key={k} name="action" size={26} title={`${tr("stat.actions")} ${n.actions}`} />
              ))}
              {n.actions === 0 && <span className="muted">0</span>}
            </div>
          )}
        </div>
        <div className="stat-row skills">
          {n.skills.map(([s, v]) => (
            <FlashStat key={s} icon={s} value={v} size={36} label={tr(`stat.${s}`)} />
          ))}
        </div>
      </div>
    </>
  );
}

/** the viewing investigator, bottom-left: big portrait, health/sanity/actions, skills; resources and clues as token piles above */
export function StatBar() {
  const game = useGame((s) => s.game) as GameState;
  const viewer = viewerOf(game);
  const cardId = viewer ? game.invs[viewer]?.cardId : null;
  const options = useCardOptions([cardId]);
  if (!viewer || !game.invs[viewer] || !cardId) return null;
  const legal = options.some((o) => optionHome(o, game, viewer) === "portrait");
  return (
    <div className="stat-dock" style={{ width: STAT_BAR_W }}>
      <StatBody inv={viewer} legal={legal} onPortrait={() => useView.getState().setModal({ card: cardId })} />
    </div>
  );
}
