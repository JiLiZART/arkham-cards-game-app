import { Icon } from "../Icon";
import { glyphChar } from "../glyphs";
import { isIcon } from "../icons";

/** numeric token layers from the tokens font, painted bottom to top (colours as in ArkhamCards) */
const NUMBER_LAYERS: [string, string][] = [
  ["token_symbol_fill", "#394852"],
  ["token_number_overlay", "#E6E1D3"],
];

/**
 * A chaos token: its art when we have it; numeric tokens are layered glyphs from the tokens font.
 * If the font can't load, CSS swaps in a generic token face with the number.
 */
export function ChaosTokenIcon({ token, size = 28 }: { token: string; size?: number }) {
  if (isIcon(token)) return <Icon name={token} size={size} title={token} />;
  const label = token.replace("-", "−");
  const number = glyphChar(`token_${token.replace("+", "")}_highlight`, "tokens");
  const face = (
    <span className={`token-face ${number ? "font-backed" : ""}`} style={{ width: size, height: size, fontSize: size * 0.42 }} title={token}>
      {label}
    </span>
  );
  if (!number) return face;
  return (
    <span className="tok-wrap" style={{ width: size, height: size }} title={token} role="img" aria-label={label}>
      <span className="tok-font" style={{ fontSize: size }} aria-hidden="true">
        {NUMBER_LAYERS.map(([name, color]) => (
          <span key={name} style={{ color }}>{glyphChar(name, "tokens")}</span>
        ))}
        <span style={{ color: "#FFFBF2" }}>{number}</span>
      </span>
      {face}
    </span>
  );
}
