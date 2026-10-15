import { useState } from "react";
import { ChaosToken } from "./ChaosToken";
import { findGlyph, FONT_FAMILY, fontFor, GLYPH_FALLBACK, GLYPH_NAMES } from "./glyphs";
import { ICON_LABELS, iconSource, iconUrl, type GlyphSource, type IconName } from "./icons";

/** a glyph layer stack (e.g. a skill box under its white icon), sized like an image icon */
function GlyphIcon({ src, size, title, fallback }: { src: GlyphSource; size: number; title: string; fallback: string }) {
  const prefer = fontFor(size);
  const layers = [src.under, src].filter(Boolean) as { glyph: string; color: string }[];
  return (
    <span className="glyph-icon" style={{ width: size * (src.aspect ?? 1), height: size, fontSize: size }} title={title} role="img" aria-label={title}>
      {layers.map((l, k) => {
        const g = findGlyph(l.glyph, prefer);
        return g ? (
          <span key={k} className="gl-i" aria-hidden="true" style={{ color: l.color, fontFamily: FONT_FAMILY[g.font] }}>
            {g.ch}
          </span>
        ) : null;
      })}
      <span className="gl-fb icon-fallback" style={{ fontSize: Math.max(8, size * 0.38) }} aria-hidden="true">
        {fallback}
      </span>
    </span>
  );
}

/** an icon: font glyph or chaos token when the fonts have it, else its PNG; a same-size text badge if it can't be drawn */
export function Icon({ name, size = 20, title }: { name: IconName; size?: number; title?: string }) {
  const [broken, setBroken] = useState(false);
  const src = iconSource(name);
  if ("token" in src) return <ChaosToken token={src.token} size={size} title={title ?? name} />;
  if ("glyph" in src) return <GlyphIcon src={src} size={size} title={title ?? name} fallback={ICON_LABELS[name]} />;
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
  const g = findGlyph(GLYPH_NAMES[name] ?? name, fontFor(size));
  return (
    <span className="gl" style={{ fontSize: size }} title={label} role="img" aria-label={label}>
      <span className="gl-i" aria-hidden="true" style={g ? { fontFamily: FONT_FAMILY[g.font] } : undefined}>
        {g?.ch}
      </span>
      <span className="gl-fb" aria-hidden="true">{GLYPH_FALLBACK[name] ?? name}</span>
    </span>
  );
}
