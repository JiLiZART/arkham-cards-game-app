import { useState } from "react";
import { GLYPH_FALLBACK, GLYPH_NAMES, glyphChar } from "./glyphs";
import { ICON_LABELS, iconUrl, type IconName } from "./icons";

/** an icon image; if it can't load, a same-size text badge takes its place (no layout shift) */
export function Icon({ name, size = 20, title }: { name: IconName; size?: number; title?: string }) {
  const [broken, setBroken] = useState(false);
  const style = { width: size, height: size };
  if (broken) {
    return (
      <span className="icon-fallback" style={{ ...style, fontSize: Math.max(8, size * 0.38) }} title={title ?? name}>
        {ICON_LABELS[name]}
      </span>
    );
  }
  return <img className="icon-img" src={iconUrl(name)} style={style} alt={title ?? name} title={title ?? name} draggable={false} onError={() => setBroken(true)} />;
}

/** icon followed by a number, e.g. health 7 */
export function Stat({ icon, value, max, size = 22, flash, label }: { icon: IconName; value: number | string; max?: number; size?: number; flash?: boolean; label?: string }) {
  // the tooltip names the stat with its value, e.g. "Health 7 / 9"
  const tip = label ? `${label} ${value}${max !== undefined ? ` / ${max}` : ""}` : undefined;
  return (
    <span className={`stat ${flash ? "flash" : ""}`} title={tip} aria-label={tip}>
      <Icon name={icon} size={size} title={tip} />
      <b>{value}</b>
      {max !== undefined && <small>/{max}</small>}
    </span>
  );
}

/** an icon-font glyph (action, reaction, fast, …); shows a readable symbol if the font can't load */
export function Glyph({ name, size = 18, title }: { name: string; size?: number; title?: string }) {
  const label = title ?? name.replace(/_/g, " ");
  return (
    <span className="gl" style={{ fontSize: size }} title={label} role="img" aria-label={label}>
      <span className="gl-i" aria-hidden="true">{glyphChar(GLYPH_NAMES[name] ?? name)}</span>
      <span className="gl-fb" aria-hidden="true">{GLYPH_FALLBACK[name] ?? name}</span>
    </span>
  );
}
