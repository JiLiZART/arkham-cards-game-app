import { Icon } from "./Icon";

/** resources, clues or damage as one token (callers show the total beside it); faint when there are none */
export function TokenPile({ kind, value, size = 40, title }: { kind: "resource" | "clue" | "damage"; value: number; size?: number; title?: string }) {
  return (
    <span className={`token-pile ${value > 0 ? "" : "token-empty"}`}>
      <Icon name={kind} size={size} title={title} />
    </span>
  );
}
