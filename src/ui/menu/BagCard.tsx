import { t } from "../../content/i18n";
import type { Difficulty } from "../../content/schema";
import { averageModifier, groupTokens } from "../game/chaos";
import { ChaosToken } from "../components/ChaosToken/index";
import { db, gameStore } from "../state/context";

const tr = (key: string, vars?: Record<string, string | number>) =>
  t(db, gameStore.getState().locale, key, vars);

/** "−1.3" with a real minus and a plus for the positive */
export const signed = (n: number) =>
  n > 0 ? `+${n.toFixed(1)}` : n < 0 ? `−${Math.abs(n).toFixed(1)}` : "0.0";

/** a difficulty drawn as its bag: the tokens grouped by kind with counts, and the average modifier */
export function BagCard({
  bag,
  difficulty,
  selected,
  onSelect,
}: {
  bag: readonly string[];
  difficulty: Difficulty;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const Tag = onSelect ? "button" : "div";
  return (
    <Tag
      className={`bag-card ${selected ? "selected" : ""}`}
      onClick={onSelect}
      aria-pressed={onSelect ? !!selected : undefined}
      data-difficulty={difficulty}
    >
      <span className="bag-head">
        <b>{tr(`difficulty.${difficulty}`)}</b>
        <small>{tr(`wizard.difficulty.${difficulty}`)}</small>
      </span>
      <span className="bag-chips">
        {groupTokens(bag).map(([token, n]) => (
          <span key={token} className="bag-group">
            <ChaosToken token={token} size={36} />
            {n > 1 && <b>×{n}</b>}
          </span>
        ))}
      </span>
      <span className="bag-average">
        {tr("wizard.average", { n: signed(averageModifier(bag)) })}
      </span>
    </Tag>
  );
}
