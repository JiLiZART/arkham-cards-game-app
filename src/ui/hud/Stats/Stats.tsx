import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cardText, t } from "../../../content/i18n";
import { SKILLS } from "../../../content/schema";
import { invOf, invOfIf } from "../../../engine/context";
import { maxHealth, maxSanity, skillValue } from "../../../engine/queries";
import { handLimit } from "../../../engine/rules/investigators";
import type { ChoiceOption, GameState, InvId } from "../../../engine/world/types";
import { db, gameStore, useGame } from "../../state/context";
import { Stat } from "../../components/Icon";
import { backUrl, cardFrame, classBackground, vitalArt } from "../../assets/images";
import { Portrait } from "../../components/Portrait";
import { TokenPile } from "../../components/TokenPile";
import { abilityOptionsOf } from "../../state/players";
import { useShown } from "../../state/usePlayers";
import { useDimmed, useView } from "../../state/view";
import { formatText } from "../Hud";
import { STAT_BAR_LAYOUT_W, statBarZoom } from "../fan";
import { useViewport } from "../../state/layoutMode";
import { OptionButtons, useCardOptions } from "../Modals";
import { cx } from "../../components/cx";
import { playSpend } from "./tokenFx";
import styles from "./Stats.module.css";

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
  const st = invOf(game, i);
  return {
    health: maxHealth(g, i) - st.damage,
    maxHealth: maxHealth(g, i),
    sanity: maxSanity(g, i) - st.horror,
    maxSanity: maxSanity(g, i),
    resources: st.resources,
    clues: st.clues,
    hand: st.hand.length,
    handLimit: handLimit(g, i),
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
  const el = useRef<HTMLDivElement>(null);
  // spending logs no event of its own: tokens fly away as the number drops (a gain lands on the event clock, ResourceFx)
  const prev = useRef(value);
  useEffect(() => {
    if (kind === "resource" && value < prev.current && el.current)
      playSpend(el.current, prev.current - value);
    prev.current = value;
  }, [kind, value]);
  const tip = `${tr(kind === "resource" ? "stat.resources" : "stat.clues")} ${value}`;
  return (
    <div
      ref={el}
      className={cx(styles.tokenStack, flash ? "flash" : "")}
      data-testid="token-stack"
      data-kind={kind}
      title={tip}
      aria-label={tip}
    >
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
      className={cx(
        styles.tokenStack,
        styles.handCount,
        flash ? "flash" : "",
        value > limit ? styles.over : "",
      )}
      title={tip}
      aria-label={tip}
    >
      <img className={styles.handCountBack} src={backUrl("player")} alt="" draggable={false} />
      <b>{value}</b>
    </div>
  );
}

/** health or sanity as on the card: the value (and the maximum) over the printed heart or brain */
function Vital({ kind, value, max }: { kind: "health" | "sanity"; value: number; max: number }) {
  const flash = useFlash(value);
  const tip = `${tr(`stat.${kind}`)} ${value} / ${max}`;
  return (
    <span
      className={cx(styles.vital, flash ? "flash" : "")}
      data-kind={kind}
      style={{ backgroundImage: `url(${vitalArt(kind)})` }}
      title={tip}
      aria-label={tip}
    >
      <b>{value}</b>
      <small>/{max}</small>
    </span>
  );
}

/** stats shared by the viewer's bar and the investigator modal, laid out like the investigator card */
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
      <div className={styles.tokenRow} data-inv={inv}>
        <TokenStack kind="resource" value={n.resources} />
        <TokenStack kind="clue" value={n.clues} />
        <HandCount value={n.hand} limit={n.handLimit} />
      </div>
      {/* the card frame of the investigator's class over the class painting */}
      <div
        className={styles.statBar}
        data-testid="stat-bar"
        style={
          {
            "--class-bg": `url(${classBackground(d)})`,
            "--frame-title": `url(${cardFrame(d, "title")})`,
            "--frame-skills": `url(${cardFrame(d, "skills")})`,
            "--frame-notes": `url(${cardFrame(d, "description")})`,
          } as CSSProperties
        }
      >
        <div className={styles.title}>
          <span className={cx(styles.statName, "card-name")}>{tx.name}</span>
          {tx.subname && <span className={styles.subname}>{tx.subname}</span>}
        </div>
        <button
          data-tip="portrait"
          className={cx(styles.portraitBtn, legal ? "legal" : "", dimmed ? "dimmed" : "")}
          onClick={onPortrait}
          title={tx.name}
          disabled={!onPortrait}
        >
          <Portrait code={inv} size={120} active={game.active === inv} />
        </button>
        <div className={styles.vitals}>
          <Vital kind="health" value={n.health} max={n.maxHealth} />
          <Vital kind="sanity" value={n.sanity} max={n.maxSanity} />
        </div>
        <div className={styles.skills}>
          {n.skills.map(([s, v]) => (
            <FlashStat key={s} icon={s} value={v} size={32} label={tr(`stat.${s}`)} />
          ))}
        </div>
        {/* the traits and the ability on the notebook, with its options when it can be used right now */}
        <div className={cx(styles.notes, "stat-who")}>
          {!!tx.traits?.length && (
            <i className={styles.traits}>{tx.traits.map((t) => `${t}.`).join(" ")}</i>
          )}
          <div
            className={cx(styles.statAbility, "card-text")}
            dangerouslySetInnerHTML={{ __html: formatText(tx.text) }}
          />
          {options && options.length > 0 && <OptionButtons options={options} />}
        </div>
      </div>
    </>
  );
}

/**
 * The investigator on screen (the one being looked at, else the decider), bottom-left at 75 %, drawn like the card:
 * the title band, the portrait with health and sanity under it, the skills strip and the ability on the notebook;
 * resources and clues as token stacks and the hand count above. The investigator's own ability options
 * are buttons under the ability text (and in the avatar sheet, which the phone uses); answers among investigators stay on
 * the avatars. The portrait opens the card.
 */
export function StatBar() {
  const game = useGame((s) => s.game) as GameState;
  const shown = useShown();
  const cardId = shown ? invOfIf(game, shown)?.cardId : null;
  const dimmed = useDimmed(shown ?? "");
  // the investigator's own ability, when the pending choice offers it (the sheet keeps the same buttons for the phone)
  const abilities = abilityOptionsOf(game, shown ?? "");
  const options = useCardOptions([cardId]).filter((o) => abilities.some((x) => x.id === o.id));
  const { width, height } = useViewport();
  if (!shown || !invOfIf(game, shown) || !cardId) return null;
  // full size at 1080p and up, smaller on a smaller window (the fan makes room for it at the same size)
  return (
    <div
      className="stat-dock"
      data-testid="stat-dock"
      style={{ width: STAT_BAR_LAYOUT_W, zoom: statBarZoom(width, height) }}
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
