import { useState } from "react";
import { ChaosToken } from "./ChaosToken";
import { hasSymbol, ICON_LABELS, iconSource, iconUrl, MARKUP_ICONS, type IconName } from "./icons";

/** sprite symbols stacked in one box, bottom first, each in its colour */
export function Symbols({
  layers,
  width,
  height,
  title,
  className = "svg-icon",
}: {
  layers: { id: string; color?: string }[];
  width: number;
  height: number;
  title?: string;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={width}
      height={height}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      {layers.map((l, k) => (
        <use key={k} href={`#${l.id}`} fill={l.color ?? "currentColor"} />
      ))}
    </svg>
  );
}

/** an icon: sprite symbols, a chaos token, or its PNG; a same-size text badge if it can't be drawn */
export function Icon({
  name,
  size = 20,
  title,
}: {
  name: IconName;
  size?: number;
  title?: string;
}) {
  const [broken, setBroken] = useState(false);
  const src = iconSource(name);
  const label = title ?? name;
  if ("token" in src) return <ChaosToken token={src.token} size={size} title={label} />;
  const fallback = (
    <span
      className="icon-fallback"
      style={{ width: size, height: size, fontSize: Math.max(8, size * 0.38) }}
      title={label}
    >
      {ICON_LABELS[name]}
    </span>
  );
  if ("glyph" in src) {
    const layers = [...(src.under ? [src.under] : []), src].map((l) => ({
      id: l.glyph,
      color: l.color,
    }));
    return layers.every((l) => hasSymbol(l.id)) ? (
      <Symbols layers={layers} width={size * (src.aspect ?? 1)} height={size} title={label} />
    ) : (
      fallback
    );
  }
  if (broken) return fallback;
  return (
    <img
      className="icon-img"
      src={iconUrl(name)}
      style={{ width: size, height: size }}
      alt={label}
      title={label}
      draggable={false}
      onError={() => setBroken(true)}
    />
  );
}

/** icon followed by a number, e.g. health 7 */
export function Stat({
  icon,
  value,
  max,
  size = 22,
  flash,
  label,
}: {
  icon: IconName;
  value: number | string;
  max?: number;
  size?: number;
  flash?: boolean;
  label?: string;
}) {
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
  if (!hasSymbol(id))
    return (
      <span className="gl-fb" title={label}>
        {label}
      </span>
    );
  return (
    <Symbols layers={[{ id }]} width={size} height={size} title={label} className="svg-icon gl" />
  );
}

/** the interface's own glyphs: one stroke, drawn like the ironwork (game symbols come from the sprite: Icon, Glyph) */
const PATHS = {
  check: "M5 12.5l4.5 4.5L19 7.5",
  redraw: "M19 12a7 7 0 1 1-2.05-4.95M19 5v4.5h-4.5",
  pass: "M6 6l6 6-6 6M12 6l6 6-6 6",
  none: "M6.5 6.5l11 11M17.5 6.5l-11 11",
  resign: "M6 21V4M6 4h11l-2.5 4L17 12H6",
  enter: "M19 5v7a3 3 0 0 1-3 3H6M10 11l-4 4 4 4",
  dot: "M12 11.2a.8.8 0 1 0 0 1.6.8.8 0 1 0 0-1.6",
  undo: "M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3",
  focus: "M12 5a7 7 0 1 0 0 14 7 7 0 1 0 0-14M12 10a2 2 0 1 0 0 4 2 2 0 1 0 0-4",
  fit: "M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5",
  menu: "M4 7h16M4 12h16M4 17h16",
  debug: "M9 5C6.5 5 7 9.5 4.5 12 7 14.5 6.5 19 9 19M15 5c2.5 0 2 4.5 4.5 7-2.5 2.5-2 7-4.5 7",
  sound: "M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12",
  mute: "M16 9l6 6M22 9l-6 6",
} as const;

export type UiIconName = keyof typeof PATHS;

export function UiIcon({ name, size = 18 }: { name: UiIconName; size?: number }) {
  const speaker = name === "sound" || name === "mute";
  return (
    <svg
      className="ui-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {speaker && <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" stroke="none" />}
      <path d={PATHS[name]} />
    </svg>
  );
}
