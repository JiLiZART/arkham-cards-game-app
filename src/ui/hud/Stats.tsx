import { useEffect, useRef, useState } from "react";
import { cardText, t } from "../../content/i18n";
import { SKILLS } from "../../content/schema";
import { maxHealth, maxSanity, skillValue } from "../../engine/core";
import { HAND_LIMIT } from "../../engine/rules/investigators";
import type { ChoiceOption, GameState, InvId } from "../../engine/types";
import { db, gameStore, useGame } from "../context";
import { Glyph, Icon, Stat } from "../Icon";
import { isIcon } from "../icons";
import { Portrait } from "../Portrait";
import { TokenPile } from "../TokenPile";
import { formatText } from "./Hud";
import { OptionButtons } from "./Modals";

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
    hand: st.hand.length,
    handLimit: HAND_LIMIT,
    skills: SKILLS.map((s) => [s, skillValue(g, i, s)] as const),
  };
}

/** resources or clues as a pile of physical tokens (fewest tokens), followed by the total */
export function TokenStack({ kind, value, size = 40 }: { kind: "resource" | "clue"; value: number; size?: number }) {
  const flash = useFlash(value);
  const tip = `${tr(kind === "resource" ? "stat.resources" : "stat.clues")} ${value}`;
  return (
    <div className={`token-stack ${flash ? "flash" : ""}`} title={tip} aria-label={tip}>
      <TokenPile kind={kind} value={value} size={size} title={tip} />
      <b>{value}</b>
    </div>
  );
}

/** the number of cards in hand beside the token stacks: a card-back icon, red over the hand limit */
export function HandCount({ value, limit }: { value: number; limit: number }) {
  const flash = useFlash(value);
  const tip = tr("stat.hand", { n: value, max: limit });
  return (
    <div className={`token-stack hand-count ${flash ? "flash" : ""} ${value > limit ? "over" : ""}`} title={tip} aria-label={tip}>
      <Glyph name="card" size={40} title={tip} />
      <b>{value}</b>
    </div>
  );
}

/** stats shared by the viewer's bar and the investigator modal */
export function StatBody({ inv, onPortrait, legal, options, dimmed }: { inv: InvId; onPortrait?: () => void; legal?: boolean; options?: ChoiceOption[]; dimmed?: boolean }) {
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
        <HandCount value={n.hand} limit={n.handLimit} />
      </div>
      <div className="stat-bar">
        <div className="stat-head">
          <button data-tip="portrait" className={`portrait-btn ${legal ? "legal" : ""} ${dimmed ? "dimmed" : ""}`} onClick={onPortrait} title={tx.name} disabled={!onPortrait}>
            <Portrait code={inv} size={120} active={game.active === inv} />
          </button>
          <div className="stat-who">
            <div className="stat-name">
              {isIcon(d.faction) && <Icon name={d.faction} size={36} />} {tx.name}
            </div>
            {/* the investigator's ability, and its options when it can be used right now */}
            <div className="stat-ability card-text" dangerouslySetInnerHTML={{ __html: formatText(tx.text) }} />
            {options && options.length > 0 && <OptionButtons options={options} />}
          </div>
        </div>
        <div className="stat-row vitals">
          <FlashStat icon="health" value={n.health} max={n.maxHealth} size={44} label={tr("stat.health")} />
          <FlashStat icon="sanity" value={n.sanity} max={n.maxSanity} size={44} label={tr("stat.sanity")} />
        </div>
        <div className="stat-row skills">
          {n.skills.map(([s, v]) => (
            <FlashStat key={s} icon={s} value={v} size={40} label={tr(`stat.${s}`)} />
          ))}
        </div>
      </div>
    </>
  );
}
