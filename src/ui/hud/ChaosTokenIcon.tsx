import { Icon } from "../Icon";
import { isIcon } from "../icons";

/** a chaos token: its art when we have it, otherwise a generic token face with the number */
export function ChaosTokenIcon({ token, size = 28 }: { token: string; size?: number }) {
  if (isIcon(token)) return <Icon name={token} size={size} title={token} />;
  return (
    <span className="token-face" style={{ width: size, height: size, fontSize: size * 0.42 }} title={token}>
      {token.replace("-", "−")}
    </span>
  );
}
