import { hasTokenArt, layersFor } from "../../assets/chaosTokens";
import { Symbols } from "../Icon";
import styles from "./ChaosToken.module.css";

/** the token disc's background gradient (ArkhamCards' values) */
const GRADIENT: Record<string, string> = {
  autoFail: "radial-gradient(circle, #8D181E 75%, #6A0B10 100%)",
  elderSign: "radial-gradient(circle, #33A1FB 0%, #3C8AC9 50%, #457398 100%)",
  bless: "radial-gradient(circle, #9C702A 25%, #695823 100%)",
  curse: "radial-gradient(circle, #362330 25%, #3B224A 100%)",
  frost: "radial-gradient(circle, #3D3A63 66%, #495483 100%)",
  blood: "radial-gradient(circle, #343433 75%, #1C1D1C 100%)",
};
const DEFAULT_GRADIENT = "radial-gradient(circle, #FFFBF2 60%, #D6CFB9 100%)";

/** a chaos token: the sprite's layers on the token disc; a plain disc with the token's label if they're missing */
export function ChaosToken({
  token,
  size = 28,
  title,
}: {
  token: string;
  size?: number;
  title?: string;
}) {
  const label = token.replace("-", "−");
  const layers = layersFor(token);
  if (!layers || !hasTokenArt(token)) {
    return (
      <span
        className={styles.tokenFace}
        style={{ width: size, height: size, fontSize: size * 0.38 }}
        title={title ?? token}
      >
        {label}
      </span>
    );
  }
  return (
    <span
      className="tok-wrap"
      style={{ width: size, height: size, background: GRADIENT[token] ?? DEFAULT_GRADIENT }}
      title={title ?? token}
      role="img"
      aria-label={title ?? label}
    >
      <Symbols layers={layers.map(([id, color]) => ({ id, color }))} width={size} height={size} />
    </span>
  );
}
