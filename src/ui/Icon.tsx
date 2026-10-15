import { useState } from "react";
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
export function Stat({ icon, value, max, size = 22, flash }: { icon: IconName; value: number | string; max?: number; size?: number; flash?: boolean }) {
  return (
    <span className={`stat ${flash ? "flash" : ""}`}>
      <Icon name={icon} size={size} />
      <b>{value}</b>
      {max !== undefined && <small>/{max}</small>}
    </span>
  );
}
