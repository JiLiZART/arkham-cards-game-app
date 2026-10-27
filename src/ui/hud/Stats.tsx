import { useEffect, useRef, useState } from "react";
import { cardText, t } from "../../content/i18n";
import { SKILLS } from "../../content/schema";
import { maxHealth, maxSanity, skillValue } from "../../engine/core";
import { HAND_LIMIT } from "../../engine/rules/investigators";
import type { ChoiceOption, GameState, InvId } from "../../engine/types";
import { db, gameStore, useGame } from "../state/context";
import { Icon, Stat } from "../components/Icon";
import { isIcon } from "../assets/icons";
import { backUrl } from "../assets/images";
import { Portrait } from "../components/Portrait";
import { TokenPile } from "../components/TokenPile";
import { abilityOptionsOf } from "../state/players";
import { useShown } from "../state/usePlayers";
import { useDimmed, useView } from "../state/view";
import { formatText } from "./Hud";
import { statBarZoom } from "./fan";
import { useViewport } from "../state/layoutMode";
import { OptionButtons, useCardOptions } from "./Modals";

const tr = (key: string, vars?: Record<string, string | number>) =>
  t(db, gameStore.getState().locale, key, vars);

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
export function TokenStack({
  kind,
  value,
  size = 40,
}: {
  kind: "resource" | "clue";
  value: number;
  size?: number;
}) {
  const flash = useFlash(value);
  const tip = `${tr(kind === "resource" ? "stat.resources" : "stat.clues")} ${value}`;
  return (
    <div className={`token-stack ${flash ? "flash" : ""}`} title={tip} aria-label={tip}>
      <TokenPile kind={kind} value={value} size={size} title={tip} />
      <b>{value}</b>
    </div>
  );
}

/** the number of cards in hand beside the token stacks: the player card back (an image, not a sprite symbol, so it can never fall back to a word) and the number, red over the hand limit */
export function HandCount({ value, limit }: { value: number; limit: number }) {
  const flash = useFlash(value);
  const tip = tr("stat.hand", { n: value, max: limit });
  return (
    <div
      className={`token-stack hand-count ${flash ? "flash" : ""} ${value > limit ? "over" : ""}`}
      title={tip}
      aria-label={tip}
    >
      <img className="hand-count-back" src={backUrl("player")} alt="" draggable={false} />
      <b>{value}</b>
    </div>
  );
}

/** stats shared by the viewer's bar and the investigator modal */
export function StatBody({
  inv,
  onPortrait,
  legal,
  options,
  dimmed,
}: {
  inv: InvId;
  onPortrait?: () => void;
  legal?: boolean;
  options?: ChoiceOption[];
  dimmed?: boolean;
}) {
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
          <button
            data-tip="portrait"
            className={`portrait-btn ${legal ? "legal" : ""} ${dimmed ? "dimmed" : ""}`}
            onClick={onPortrait}
            title={tx.name}
            disabled={!onPortrait}
          >
            <Portrait code={inv} size={120} active={game.active === inv} />
          </button>
          <div className="stat-who">
            <div className="stat-name">
              {isIcon(d.faction) && <Icon name={d.faction} size={36} />} {tx.name}
            </div>
            {/* the investigator's ability, and its options when it can be used right now */}
            <div
              className="stat-ability card-text"
              dangerouslySetInnerHTML={{ __html: formatText(tx.text) }}
            />
            {options && options.length > 0 && <OptionButtons options={options} />}
          </div>
        </div>
        <div className="stat-row vitals">
          <FlashStat
            icon="health"
            value={n.health}
            max={n.maxHealth}
            size={44}
            label={tr("stat.health")}
          />
          <FlashStat
            icon="sanity"
            value={n.sanity}
            max={n.maxSanity}
            size={44}
            label={tr("stat.sanity")}
          />
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

/**
 * The investigator on screen (the one being looked at, else the decider), bottom-left at 75 %: portrait, ability, health
 * and sanity, skills; resources and clues as token stacks and the hand count above. The investigator's own ability options
 * are buttons under the ability text (and in the avatar sheet, which the phone uses); answers among investigators stay on
 * the avatars. The portrait opens the card.
 */
export function StatBar() {
  const game = useGame((s) => s.game) as GameState;
  const shown = useShown();
  const cardId = shown ? game.invs[shown]?.cardId : null;
  const dimmed = useDimmed(shown ?? "");
  // the investigator's own ability, when the pending choice offers it (the sheet keeps the same buttons for the phone)
  const abilities = abilityOptionsOf(game, shown ?? "");
  const options = useCardOptions([cardId]).filter((o) => abilities.some((x) => x.id === o.id));
  const { width, height } = useViewport();
  if (!shown || !game.invs[shown] || !cardId) return null;
  // full size at 1080p and up, smaller on a smaller window (the fan makes room for it at the same size)
  return (
    <div
      className="stat-dock"
      data-ui="stat-dock"
      style={{ width: 420, zoom: statBarZoom(width, height) }}
    >
      <StatBody
        inv={shown}
        dimmed={dimmed}
        legal={options.length > 0}
        options={options}
        onPortrait={() => useView.getState().setModal({ card: cardId })}
      />
    </div>
  );
}
