import { useState } from "react";
import { ChaosToken } from "./ChaosToken";
import { hasSymbol, ICON_LABELS, iconSource, iconUrl, MARKUP_ICONS, type IconName } from "./icons";

/** sprite symbols stacked in one box, bottom first, each in its colour */
export function Symbols({ layers, width, height, title, className = "svg-icon" }: { layers: { id: string; color?: string }[]; width: number; height: number; title?: string; className?: string }) {
  return (
    <svg className={className} width={width} height={height} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      {layers.map((l, k) => (
        <use key={k} href={`#${l.id}`} fill={l.color ?? "currentColor"} />
      ))}
    </svg>
  );
}

/** an icon: sprite symbols, a chaos token, or its PNG; a same-size text badge if it can't be drawn */
export function Icon({ name, size = 20, title }: { name: IconName; size?: number; title?: string }) {
  const [broken, setBroken] = useState(false);
  const src = iconSource(name);
  const label = title ?? name;
  if ("token" in src) return <ChaosToken token={src.token} size={size} title={label} />;
  const fallback = (
    <span className="icon-fallback" style={{ width: size, height: size, fontSize: Math.max(8, size * 0.38) }} title={label}>
      {ICON_LABELS[name]}
    </span>
  );
  if ("glyph" in src) {
    const layers = [...(src.under ? [src.under] : []), src].map((l) => ({ id: l.glyph, color: l.color }));
    return layers.every((l) => hasSymbol(l.id)) ? <Symbols layers={layers} width={size * (src.aspect ?? 1)} height={size} title={label} /> : fallback;
  }
  if (broken) return fallback;
  return <img className="icon-img" src={iconUrl(name)} style={{ width: size, height: size }} alt={label} title={label} draggable={false} onError={() => setBroken(true)} />;
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

/** a one-colour symbol in the text colour (action, reaction, free, per investigator, …) by markup key or symbol id; its name as text if the sprite lacks it */
export function Glyph({ name, size = 18, title }: { name: string; size?: number; title?: string }) {
  const label = title ?? name.replace(/_/g, " ");
  const id = MARKUP_ICONS[name] ?? name;
  if (!hasSymbol(id)) return <span className="gl-fb" title={label}>{label}</span>;
  return <Symbols layers={[{ id }]} width={size} height={size} title={label} className="svg-icon gl" />;
}
