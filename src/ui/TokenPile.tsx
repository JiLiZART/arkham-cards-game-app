import { stackTokens } from "./hud/tokenStack";
import { Icon } from "./Icon";
import type { IconName } from "./icons";

const STACKS: Record<"resource" | "clue", { denominations: number[]; art: Record<number, IconName> }> = {
  resource: { denominations: [5, 3, 1], art: { 5: "resource-5", 3: "resource-3", 1: "resource" } },
  clue: { denominations: [3, 1], art: { 3: "clue-3", 1: "clue" } },
};

/** resources or clues as a pile of physical tokens (fewest tokens, overlapping); a faint single token when there are none */
export function TokenPile({ kind, value, size = 40, title }: { kind: "resource" | "clue"; value: number; size?: number; title?: string }) {
  const { denominations, art } = STACKS[kind];
  const tokens = stackTokens(value, denominations);
  return (
    <div className="token-pile" style={{ width: size + Math.max(0, tokens.length - 1) * size * 0.45, height: size }}>
      {tokens.length === 0 && (
        <span className="token-empty">
          <Icon name={art[1]} size={size} title={title} />
        </span>
      )}
      {tokens.map((d, k) => (
        <span key={k} style={{ left: k * size * 0.45, zIndex: tokens.length - k }}>
          <Icon name={art[d]} size={size} title={title} />
        </span>
      ))}
    </div>
  );
}
